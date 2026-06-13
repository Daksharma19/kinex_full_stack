import {Router} from 'express';
import * as adminController from '../controllers/admin.controller';
import { requireAuth, requireProfile, requireRole } from '../middleware/auth.middleware';

const adminRouter = Router();

// Every admin route requires an authenticated ADMIN profile.
adminRouter.use(requireAuth, requireProfile, requireRole("ADMIN"));

adminRouter.get("/doctors",adminController.listDoctorApplication)
adminRouter.patch("/doctors/:id/verify",adminController.verifyDoctor)
adminRouter.post("/admins",adminController.createAdmin) 




export default adminRouter;
