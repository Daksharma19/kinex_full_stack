import {Router} from "express";
import * as appointmentController from "../controllers/appointment.controller"
import { requireAuth, requireProfile, requireRole } from "../middleware/auth.middleware";
const appointmentRouter = Router();

// Every appointment route requires an authenticated user with a profile.
appointmentRouter.use(requireAuth, requireProfile);

appointmentRouter.post("/", requireRole("PATIENT"), appointmentController.createAppointment)
appointmentRouter.post("/:id/payment/resume", requireRole("PATIENT"), appointmentController.resumePayment)
appointmentRouter.post("/:id/payment/verify", requireRole("PATIENT"), appointmentController.verifyAppointmentPayment)
appointmentRouter.delete("/:id/release", requireRole("PATIENT"), appointmentController.releaseAppointment)
// Join the video room for a confirmed online appointment (participant-only).
appointmentRouter.post("/:id/join", appointmentController.joinAppointment)
appointmentRouter.get("/:id", appointmentController.getAppointmentById)
appointmentRouter.get("/", appointmentController.listMyAppointments)
appointmentRouter.patch("/:id/status", appointmentController.updateAppointmentStatus)
// TEMPORARY: admin-only hard delete of an appointment from the DB.
appointmentRouter.delete("/:id", requireRole("ADMIN"), appointmentController.adminDeleteAppointment)

export default appointmentRouter;
