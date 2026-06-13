import {Router} from "express";
import * as appointmentController from "../controllers/appointment.controller"
import { requireAuth, requireProfile, requireRole } from "../middleware/auth.middleware";
const appointmentRouter = Router();

// Every appointment route requires an authenticated user with a profile.
appointmentRouter.use(requireAuth, requireProfile);

appointmentRouter.post("/", requireRole("PATIENT"), appointmentController.createAppointment)
appointmentRouter.get("/:id", appointmentController.getAppointmentById)
appointmentRouter.get("/", appointmentController.listMyAppointments)
appointmentRouter.patch("/:id/status", appointmentController.updateAppointmentStatus)

export default appointmentRouter;
