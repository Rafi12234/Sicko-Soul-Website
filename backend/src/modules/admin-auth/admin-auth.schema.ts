import { z } from "zod";

export const staffLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});
