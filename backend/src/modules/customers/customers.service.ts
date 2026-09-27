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
    },
    update: {
      full_name: input.name,
      phone: input.phone,
    },
  });

  const address = await tx.customer_addresses.create({
    data: {
      customer_id: customer.customer_id,
      label: "ORDER",
      recipient_name: input.name,
      recipient_phone: input.phone,
      address_line: input.shipping.address,
      city: input.shipping.city,
      district: input.shipping.district,
      postal_code: input.shipping.postalCode ?? null,
      landmark: input.shipping.landmark ?? null,
      is_default: false,
    },
  });

  return { customer, address };
}
