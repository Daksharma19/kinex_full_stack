import {Router} from 'express';
import * as adminController from '../controllers/admin.controller';

const adminRouter = Router();

adminRouter.get("/doctors",adminController.listDoctorApplication)
adminRouter.patch("/doctors/:id/verify",adminController.verifyDoctor)
adminRouter.post("/admins",adminController.createAdmin)

export default adminRouter;