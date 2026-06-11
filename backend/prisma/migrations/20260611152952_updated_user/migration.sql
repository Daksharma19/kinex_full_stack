-- AlterTable
ALTER TABLE "patients" ALTER COLUMN "date_of_birth" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'PATIENT';
