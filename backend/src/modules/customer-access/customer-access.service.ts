// Email recovery has been temporarily disabled by design. Keep this fail-closed
// compatibility export so accidentally retained old controllers cannot send links
// or grant access by matching customer information.
import { AppError } from "../../errors/app-error.js";
import type { AccessKind } from "./customer-access.js";

export async function sendCustomerAccessLink(_kind: AccessKind, _reference: string, _email: string): Promise<never> {
  throw new AppError({ statusCode: 410, code: "EMAIL_RECOVERY_DISABLED", message: "Email access recovery is temporarily unavailable. Keep the private link issued at checkout or case creation." });
}
