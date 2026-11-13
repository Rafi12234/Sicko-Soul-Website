/** Self-contained transactional email templates. Do not fetch remote assets. */
export type OrderEmailPayload = Record<string, unknown>;

function str(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function escapeEmailHtml(value: unknown): string {
  return str(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function safeTrackingUrl(payload: OrderEmailPayload): string | null {
  const candidate = str(payload.trackingUrl);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    // No arbitrary schemes, credentials, or cross-domain redirect parameters.
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    if (!/^\/orders\/[A-Za-z0-9_.%~-]+$/.test(url.pathname) || !/^#access=eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(url.hash)) return null;
    if (url.search) return null;
    return url.href;
  } catch { return null; }
}

type Copy = { eyebrow: string; heading: string; intro: string; next: string };
function copy(templateKey: string): Copy {
  switch (templateKey) {
    case "order-received": return {
      eyebrow: "ORDER REQUEST RECEIVED", heading: "YOUR ORDER IS PENDING",
      intro: "Thanks for ordering from SICKO SOUL. Your request is saved, but it has NOT been confirmed yet.",
      next: "Our team will review your request and may contact you. Stock is not reserved until an admin confirms your order.",
    };
    case "order-on-hold": return {
      eyebrow: "ORDER ON HOLD", heading: "WE ARE WAITING FOR RESTOCK",
      intro: "As agreed, your order request is on hold while incoming stock is expected. This is not a confirmed order, and no stock is reserved yet.",
      next: "We will review your request when stock arrives. Use your private link to follow its status.",
    };
    case "order-confirmed": return {
      eyebrow: "ORDER CONFIRMED", heading: "YOUR ORDER IS CONFIRMED",
      intro: "Our team reviewed and confirmed your order. We're preparing your garments.",
      next: "Use your private link to follow the progress of your order.",
    };
    case "order-cancelled": return {
      eyebrow: "ORDER STATUS UPDATE", heading: "YOUR ORDER WAS NOT CONFIRMED",
      intro: "Your order request has been rejected or cancelled. If you already made a payment, please contact our team.",
      next: "If you believe this is a mistake, please contact our support team with your order reference.",
    };
    case "order-out-of-stock": return {
      eyebrow: "ORDER STATUS UPDATE", heading: "ITEM UNAVAILABLE",
      intro: "We couldn't confirm your order because a requested item is no longer available.",
      next: "Please contact our team if you would like an alternative item or size.",
    };
    case "order-shipped": return {
      eyebrow: "SHIPPING UPDATE", heading: "YOUR ORDER HAS SHIPPED",
      intro: "Your order has been handed over for delivery.",
      next: "Open your private tracking link to see shipping updates.",
    };
    case "order-delivered": return {
      eyebrow: "DELIVERY UPDATE", heading: "DELIVERY RECORDED",
      intro: "Your order is marked as delivered.",
      next: "Thank you for shopping with SICKO SOUL.",
    };
    default: return {
      eyebrow: "SICKO SOUL UPDATE", heading: "YOUR RECORD HAS AN UPDATE",
      intro: "We have an update about your SICKO SOUL request.",
      next: "Contact our support team if you need assistance.",
    };
  }
}

export function renderTransactionalEmail(subject: string, templateKey: string, payload: OrderEmailPayload): { html: string; text: string } {
  const c = copy(templateKey);
  const reference = str(payload.orderReference);
  const status = str(payload.status).replaceAll("_", " ");
  const reason = str(payload.reason);
  const items = str(payload.items);
  const amount = typeof payload.totalBDT === "number" ? `৳ ${payload.totalBDT.toLocaleString("en-BD", { maximumFractionDigits: 2 })}` : "";
  const link = safeTrackingUrl(payload);
  const fields = [
    ["Order reference", reference],
    ["Status", status],
    ["Total", amount],
    ["Items", items],
    ["Payment", str(payload.paymentMethod)],
    ["Courier", str(payload.courier)],
    ["Courier tracking", str(payload.trackingCode)],
    ["Delivery address", str(payload.deliveryAddress)],
    ["Reason", reason],
    ["Expected restock", str(payload.expectedRestockDate)],
    ["Customer agreed to wait until", str(payload.customerWaitUntil)],
  ].filter(([, value]) => Boolean(value));
  const table = fields.map(([key, val]) => `<tr><td style="padding:9px 12px;color:#aaa;border-bottom:1px solid #333;vertical-align:top">${escapeEmailHtml(key)}</td><td style="padding:9px 12px;color:#fff;border-bottom:1px solid #333;vertical-align:top">${escapeEmailHtml(val)}</td></tr>`).join("");
  const button = link ? `<p style="margin:30px 0"><a href="${escapeEmailHtml(link)}" style="display:inline-block;background:#a90000;color:#fff;padding:15px 24px;text-decoration:none;font-weight:bold;letter-spacing:1px">OPEN PRIVATE ORDER TRACKING</a></p><p style="font-size:12px;color:#aaa;line-height:1.6">This link gives access to your private order details and is valid for up to 30 days. Do not share or forward it.</p>` : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0b0b0d;color:#fff;font-family:Arial,Helvetica,sans-serif"><div style="max-width:600px;margin:0 auto;padding:38px 24px"><p style="font-weight:900;font-size:22px;letter-spacing:2px">SICKO SOUL</p><p style="color:#df4444;font-size:11px;letter-spacing:3px;font-weight:bold">${escapeEmailHtml(c.eyebrow)}</p><h1 style="font-size:30px;line-height:1.12;margin:18px 0 20px">${escapeEmailHtml(c.heading)}</h1><p style="color:#ddd;line-height:1.7">${escapeEmailHtml(c.intro)}</p><table role="presentation" style="border-collapse:collapse;width:100%;margin:24px 0;font-size:14px">${table}</table><p style="color:#ddd;line-height:1.7">${escapeEmailHtml(c.next)}</p>${button}<p style="font-size:12px;color:#777;margin-top:36px;border-top:1px solid #333;padding-top:20px">Automated SICKO SOUL notification. Please do not forward private order links. Reference: ${escapeEmailHtml(reference || subject)}</p></div></body></html>`;
  const text = ["SICKO SOUL", "", c.eyebrow, c.heading, "", c.intro, "", ...fields.map(([k, v]) => `${k}: ${v}`), "", c.next,
    ...(link ? ["", "PRIVATE ORDER TRACKING LINK:", link, "", "This link is private and valid for up to 30 days. Do not share it."] : []),
    "", "Automated SICKO SOUL notice."].join("\n");
  return { html, text };
}
