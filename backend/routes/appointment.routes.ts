import {Router} from "express";
import * as appointmentController from "../controllers/appointment.controller"
const appointmentRouter = Router();

appointmentRouter.post("/",appointmentController.createAppointment)
appointmentRouter.get("/:id",appointmentController.getAppointmentById)
appointmentRouter.get("/",appointmentController.listMyAppointments)
appointmentRouter.patch("/:id/status",appointmentController.updateAppointmentStatus)

export default appointmentRouter;
