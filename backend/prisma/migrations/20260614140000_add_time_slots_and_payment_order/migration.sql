-- CreateTable
CREATE TABLE "time_slots" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "is_booked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_slots_doctor_id_starts_at_idx" ON "time_slots"("doctor_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "time_slots_doctor_id_starts_at_key" ON "time_slots"("doctor_id", "starts_at");

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "slot_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "appointments_slot_id_key" ON "appointments"("slot_id");

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "gateway_order_id" TEXT;

-- AddForeignKey
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "time_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
