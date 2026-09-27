import { z } from "zod";

export const outboxIdParamsSchema = z.object({
  outboxId: z.string().regex(/^\d+$/),
});
