import { randomUUID } from "node:crypto";
import type {
  Prisma,
  email_outbox_event_type,
} from "../../../generated/prisma/client.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";

export type EmailPayload = Record<string, unknown>;

export async function enqueueEmail(
  tx: Prisma.TransactionClient,
  input: {
    dedupeKey: string;
    eventType: email_outbox_event_type;
    orderId?: bigint | null | undefined;
    complaintId?: bigint | null | undefined;
    customerId?: bigint | null | undefined;
    recipientName?: string | null | undefined;
    recipientEmail: string;
    subject: string;
    templateKey: string;
    payload: EmailPayload;
  },
): Promise<void> {
  await tx.email_outbox.upsert({
    where: { dedupe_key: input.dedupeKey },
    create: {
      dedupe_key: input.dedupeKey,
      event_type: input.eventType,
      order_id: input.orderId ?? null,
      complaint_id: input.complaintId ?? null,
      customer_id: input.customerId ?? null,
      recipient_name: input.recipientName ?? null,
      recipient_email: input.recipientEmail,
      subject: input.subject,
      template_key: input.templateKey,
      payload: JSON.stringify(input.payload),
      status: "PENDING",
    },
    update: {},
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderHtml(subject: string, payload: EmailPayload): string {
  const rows = Object.entries(payload)
    .map(([key, value]) => `<tr><td style="padding:6px 12px;font-weight:700">${escapeHtml(key)}</td><td style="padding:6px 12px">${escapeHtml(value)}</td></tr>`)
    .join("");
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#fff;padding:24px"><h1>${escapeHtml(subject)}</h1><table>${rows}</table><p style="opacity:.6">SICKO SOUL / AUTOMATED NOTICE</p></body></html>`;
}

async function sendEmail(input: {
  to: string;
  subject: string;
  payload: EmailPayload;
}): Promise<string> {
  if (env.EMAIL_TRANSPORT === "console") {
    // Local console mode must not leak customer access links or customer details.
    logger.info({ mode: "console", subjectCategory: input.subject.split(" /")[0] }, "email simulated (not delivered)");
    return `console-${Date.now()}-${randomUUID()}`;
  }

  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: renderHtml(input.subject, input.payload),
    }),
  });

  const body = (await response.json()) as { id?: string; message?: string };
  if (!response.ok || !body.id) {
    throw new Error(body.message ?? `Email provider returned HTTP ${response.status}.`);
  }
  return body.id;
}

export async function processEmailOutboxBatch(limit = env.EMAIL_WORKER_BATCH_SIZE): Promise<number> {
  const now = new Date();
  const staleBefore = new Date(Date.now() - env.EMAIL_WORKER_LOCK_TIMEOUT_MS);

  // Recover jobs left in PROCESSING by a crashed/restarted worker. The claim step
  // below still prevents two live workers from delivering the same row together.
  await prisma.email_outbox.updateMany({
    where: {
      status: "PROCESSING",
      locked_at: { lt: staleBefore },
    },
    data: {
      status: "FAILED",
      locked_at: null,
      available_at: now,
      last_error: "Recovered stale email worker lock.",
    },
  });

  const candidates = await prisma.email_outbox.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      available_at: { lte: now },
    },
    orderBy: [{ available_at: "asc" }, { email_outbox_id: "asc" }],
    take: Math.max(limit, limit * 4),
  });

  const rows: typeof candidates = [];
  for (const row of candidates) {
    if (row.attempt_count >= row.max_attempts) {
      await prisma.email_outbox.updateMany({
        where: {
          email_outbox_id: row.email_outbox_id,
          status: { in: ["PENDING", "FAILED"] },
        },
        data: { status: "DEAD", locked_at: null },
      });
      continue;
    }
    rows.push(row);
    if (rows.length >= limit) break;
  }

  let processed = 0;

  for (const row of rows) {
    const claimed = await prisma.email_outbox.updateMany({
      where: {
        email_outbox_id: row.email_outbox_id,
        status: { in: ["PENDING", "FAILED"] },
      },
      data: {
        status: "PROCESSING",
        locked_at: new Date(),
        attempt_count: { increment: 1 },
      },
    });
    if (claimed.count !== 1) continue;

    try {
      let payload: EmailPayload = {};
      try {
        payload = JSON.parse(row.payload) as EmailPayload;
      } catch {
        payload = { raw: row.payload };
      }

      const providerMessageId = await sendEmail({
        to: row.recipient_email,
        subject: row.subject,
        payload,
      });

      await prisma.$transaction([
        prisma.email_outbox.update({
          where: { email_outbox_id: row.email_outbox_id },
          data: {
            status: "SENT",
            sent_at: new Date(),
            locked_at: null,
            last_error: null,
            provider_message_id: providerMessageId,
          },
        }),
        prisma.email_delivery_events.create({
          data: {
            email_outbox_id: row.email_outbox_id,
            provider_event_id: `${providerMessageId}:sent`,
            event_type: "SENT",
            payload: JSON.stringify({ providerMessageId }),
          },
        }),
      ]);
      processed += 1;
    } catch (error) {
      const attempt = row.attempt_count + 1;
      const dead = attempt >= row.max_attempts;
      const delayMinutes = Math.min(60, 2 ** Math.max(0, attempt - 1));
      const availableAt = new Date(Date.now() + delayMinutes * 60_000);

      await prisma.email_outbox.update({
        where: { email_outbox_id: row.email_outbox_id },
        data: {
          status: dead ? "DEAD" : "FAILED",
          available_at: availableAt,
          locked_at: null,
          last_error: error instanceof Error ? error.message.slice(0, 65000) : "Unknown email error",
        },
      });
      logger.error({ err: error, emailOutboxId: row.email_outbox_id.toString() }, "email delivery failed");
    }
  }

  return processed;
}


export function startEmailWorker(): () => void {
  if (!env.EMAIL_WORKER_ENABLED) {
    logger.info("email worker disabled");
    return () => {};
  }

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await processEmailOutboxBatch();
    } catch (error) {
      logger.error({ err: error }, "email worker batch failed");
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), env.EMAIL_WORKER_INTERVAL_MS);
  timer.unref();
  logger.info({ transport: env.EMAIL_TRANSPORT }, "email worker started");

  return () => clearInterval(timer);
}

export async function listOutboxForAdmin() {
  const rows = await prisma.email_outbox.findMany({
    orderBy: [{ created_at: "desc" }],
    take: 200,
  });
  return rows.map((row) => ({
    id: row.email_outbox_id.toString(),
    dedupeKey: row.dedupe_key,
    eventType: row.event_type,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    templateKey: row.template_key,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at.toISOString(),
    sentAt: row.sent_at?.toISOString() ?? null,
    lastError: row.last_error,
    providerMessageId: row.provider_message_id,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function retryOutboxItem(id: bigint) {
  const row = await prisma.email_outbox.update({
    where: { email_outbox_id: id },
    data: {
      status: "PENDING",
      available_at: new Date(),
      locked_at: null,
      last_error: null,
    },
  });
  return { id: row.email_outbox_id.toString(), status: row.status };
}
