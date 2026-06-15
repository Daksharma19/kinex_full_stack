-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "meeting_id" TEXT,
ADD COLUMN     "room_url" TEXT,
ADD COLUMN     "host_room_url" TEXT,
ADD COLUMN     "reminder_sent_at" TIMESTAMP(3);
