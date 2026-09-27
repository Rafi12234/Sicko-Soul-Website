import type { RequestHandler } from "express";
import { outboxIdParamsSchema } from "./email.schema.js";
import {
  listOutboxForAdmin,
  processEmailOutboxBatch,
  retryOutboxItem,
} from "./email.service.js";

export const adminListOutboxController: RequestHandler = async (_req, res) => {
  const data = await listOutboxForAdmin();
  res.json({ data, meta: { count: data.length } });
};

export const adminProcessOutboxController: RequestHandler = async (_req, res) => {
  const processed = await processEmailOutboxBatch();
  res.json({ data: { processed } });
};

export const adminRetryOutboxController: RequestHandler = async (req, res) => {
  const { outboxId } = outboxIdParamsSchema.parse(req.params);
  res.json({ data: await retryOutboxItem(BigInt(outboxId)) });
};
