import {Router} from 'express';
import * as adminController from '../controllers/admin.controller';
import { requireAuth, requireProfile, requireRole } from '../middleware/auth.middleware';

const adminRouter = Router();

// Every admin route requires an authenticated ADMIN profile.
adminRouter.use(requireAuth, requireProfile, requireRole("ADMIN"));

adminRouter.get("/doctors",adminController.listDoctorApplication)
adminRouter.patch("/doctors/:id/verify",adminController.verifyDoctor)

// Manage admins: list all registered users, and promote one to ADMIN.
adminRouter.get("/users",adminController.listUsers)
// Full detail for one doctor (by their profile id): credentials, appointments, earnings.
adminRouter.get("/users/:id/doctor-details",adminController.getDoctorDetails)
adminRouter.patch("/users/:id/promote",adminController.promoteToAdmin)
adminRouter.delete("/users/:id",adminController.deleteUser)
adminRouter.post("/admins",adminController.createAdmin)




export default adminRouter;
