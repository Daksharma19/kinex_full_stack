import {Router} from 'express';
import * as doctorController from '../controllers/doctor.controller';
import { requireAuth, requireProfile, requireRole } from '../middleware/auth.middleware';

const doctorRouter = Router();

// Public: email/password doctor signup (creates pre-confirmed auth user +
// DOCTOR profile, status PENDING) — no email confirmation needed.
doctorRouter.post('/signup', doctorController.registerDoctor);
// Applicant is already authenticated (e.g. via Google) but has no profile yet.
doctorRouter.post('/apply', requireAuth, doctorController.applyAsDoctor);

// Signed-in doctor manages their own profile + photo.
doctorRouter.patch('/me', requireAuth, requireProfile, requireRole('DOCTOR'), doctorController.updateMyDoctorProfile);
doctorRouter.post('/me/photo', requireAuth, requireProfile, requireRole('DOCTOR'), doctorController.uploadMyPhoto);
// Public: list bookable (VERIFIED) doctors. Declared before '/:id' so the
// literal path wins over the param route.
doctorRouter.get('/', doctorController.listVerifiedDoctors);
// Public.
doctorRouter.get('/:id', doctorController.getDoctorById);

export default doctorRouter;
