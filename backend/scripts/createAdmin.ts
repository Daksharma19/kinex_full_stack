import "dotenv/config";
import { prisma } from "../db.ts";
import { supabaseAdmin } from "../utils/supabase.ts";

const ADMIN_EMAIL = "admin@clinic.com";
const ADMIN_PASSWORD = "admin123";

async function main() {
  // 1. Create (or find) the Supabase auth user, email pre-confirmed.
  let authUserId: string | undefined;

  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

  if (created?.user) {
    authUserId = created.user.id;
  } else {
    // Likely already exists — look it up by listing users.
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    authUserId = list?.users.find((u) => u.email === ADMIN_EMAIL)?.id;
    if (!authUserId) {
      throw new Error(
        `Failed to create or find admin auth user: ${createError?.message ?? "unknown error"}`
      );
    }
  }

  // 2. Create the matching ADMIN profile keyed by the auth user's id.
  const admin = await prisma.profile.upsert({
    where: { id: authUserId },
    update: { role: "ADMIN" },
    create: {
      id: authUserId,
      name: "Admin",
      email: ADMIN_EMAIL,
      role: "ADMIN",
    },
  });

  console.log("Admin ready:", admin.email, `(id: ${admin.id})`);
}

main().finally(() => process.exit(0));
