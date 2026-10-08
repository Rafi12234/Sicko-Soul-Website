import type { Prisma } from "../../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";

export async function upsertCustomerAndAddress(
  tx: Prisma.TransactionClient,
  input: {
    name: string;
    phone: string;
    email: string;
    shipping: {
      address: string;
      city: string;
      district: string;
      postalCode?: string | undefined;
      landmark?: string | undefined;
    };
  },
) {
  const existing = await tx.customers.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing?.status === "BLOCKED") {
    throw new AppError({
      statusCode: 403,
      code: "CUSTOMER_BLOCKED",
      message: "This customer cannot place orders.",
    });
  }

  const customer = await tx.customers.upsert({
    where: { email: input.email.toLowerCase() },
    create: {
      full_name: input.name,
      phone: input.phone,
      email: input.email.toLowerCase(),
      status: "ACTIVE",
      first_order_at: new Date(),
      last_order_at: new Date(),
    },
    update: {}, // Checkout does not prove email ownership; never mutate existing profile.
  });

  // Checkout does not verify email ownership. Keep all shipping details on
  // the order's immutable snapshot, not on the reusable customer profile.
  // This also handles two unverified checkouts racing with the same email.
  return { customer, address: null };

}
