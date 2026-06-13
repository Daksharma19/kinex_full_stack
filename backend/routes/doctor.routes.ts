import {Router} from 'express';
import * as doctorController from '../controllers/doctor.controller';
import { requireAuth } from '../middleware/auth.middleware';

const doctorRouter = Router();

// Applicant is authenticated but does not have a profile yet.
doctorRouter.post('/apply', requireAuth, doctorController.applyAsDoctor);
// Public.
doctorRouter.get('/:id', doctorController.getDoctorById);

export default doctorRouter;
