import {Router} from 'express';
import * as doctorController from '../controllers/doctor.controller';
import { requireAuth, requireProfile, requireRole } from '../middleware/auth.middleware';

const doctorRouter = Router();

// Doctor signup is handled on the frontend via supabase.auth.signUp() with email
// confirmation. The DOCTOR profile (status PENDING) is created here once the
// applicant confirms and is authenticated — AuthContext reads the stashed
// details and calls POST /doctor/apply.
doctorRouter.post('/apply', requireAuth, doctorController.applyAsDoctor);

// Signed-in doctor manages their own profile + photo.
doctorRouter.patch('/me', requireAuth, requireProfile, requireRole('DOCTOR'), doctorController.updateMyDoctorProfile);
doctorRouter.post('/me/photo', requireAuth, requireProfile, requireRole('DOCTOR'), doctorController.uploadMyPhoto);

// Signed-in doctor manages their own bookable time slots.
doctorRouter.get('/me/slots', requireAuth, requireProfile, requireRole('DOCTOR'), doctorController.listMySlots);
doctorRouter.post('/me/slots', requireAuth, requireProfile, requireRole('DOCTOR'), doctorController.createMySlots);
doctorRouter.delete('/me/slots/:id', requireAuth, requireProfile, requireRole('DOCTOR'), doctorController.deleteMySlot);

// Public: list bookable (VERIFIED) doctors. Declared before '/:id' so the
// literal path wins over the param route.
doctorRouter.get('/', doctorController.listVerifiedDoctors);
// Public: a doctor's available slots (declared before '/:id').
doctorRouter.get('/:id/slots', doctorController.listDoctorSlots);
// Public.
doctorRouter.get('/:id', doctorController.getDoctorById);

export default doctorRouter;
