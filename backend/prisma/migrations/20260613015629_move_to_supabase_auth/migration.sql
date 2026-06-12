-- DropForeignKey
ALTER TABLE "doctors" DROP CONSTRAINT "doctors_user_id_fkey";

-- DropForeignKey
ALTER TABLE "doctors" DROP CONSTRAINT "doctors_verified_by_fkey";

-- DropForeignKey
ALTER TABLE "patients" DROP CONSTRAINT "patients_user_id_fkey";

-- DropIndex
DROP INDEX "doctors_user_id_key";

-- DropIndex
DROP INDEX "patients_user_id_key";

-- AlterTable
ALTER TABLE "doctors" DROP COLUMN "user_id",
ADD COLUMN     "profile_id" UUID NOT NULL,
DROP COLUMN "verified_by",
ADD COLUMN     "verified_by" UUID;

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "user_id",
ADD COLUMN     "profile_id" UUID NOT NULL;

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_profile_id_key" ON "doctors"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_profile_id_key" ON "patients"("profile_id");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

