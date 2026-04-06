import { db, users } from "@minidrive/db";
import { eq } from "drizzle-orm";
import { auth } from "./lib/auth.js";

const SUPERADMIN = {
  email: "admin@minidrive.com",
  password: "admin123",
  name: "Superadmin",
};

async function seed() {
  console.log("Checking if superadmin exists...");

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, SUPERADMIN.email))
    .limit(1);

  if (existing.length > 0) {
    console.log("Superadmin already exists, skipping.");
    process.exit(0);
  }

  console.log("Creating superadmin...");

  await auth.api.signUpEmail({
    body: {
      email: SUPERADMIN.email,
      password: SUPERADMIN.password,
      name: SUPERADMIN.name,
    },
  });

  await db
    .update(users)
    .set({ role: "superadmin" })
    .where(eq(users.email, SUPERADMIN.email));

  console.log("Superadmin created: admin@minidrive.com / admin123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
