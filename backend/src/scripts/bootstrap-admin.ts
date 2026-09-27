import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { prisma, disconnectDatabase } from "../lib/prisma.js";

async function main() {
  const name = env.BOOTSTRAP_ADMIN_NAME;
  const email = env.BOOTSTRAP_ADMIN_EMAIL;
  const password = env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD in backend/.env before running admin:bootstrap.",
    );
  }

  const existingSuperAdmin = await prisma.staff_users.findFirst({
    where: { role: "SUPER_ADMIN", is_active: true },
  });

  if (existingSuperAdmin && existingSuperAdmin.email !== email.toLowerCase()) {
    throw new Error(
      "An active SUPER_ADMIN already exists. Create additional staff through the authenticated admin API.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const staff = await prisma.staff_users.upsert({
    where: { email: email.toLowerCase() },
    create: {
      full_name: name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role: "SUPER_ADMIN",
      is_active: true,
    },
    update: {
      full_name: name,
      password_hash: passwordHash,
      role: "SUPER_ADMIN",
      is_active: true,
    },
  });

  console.log(`SUPER_ADMIN ready: ${staff.email} (id ${staff.staff_user_id.toString()})`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
