import "dotenv/config";
import { prisma } from "../db.ts";
import bcrypt from "bcrypt";

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@clinic.com" },
    update: {},
    create: { name: "Admin", email: "admin@clinic.com", passwordHash, role: "ADMIN" },
  });
  console.log("Admin ready:", admin.email);
}
main().finally(() => process.exit(0));