import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
const authRouter = Router();

// Public: create a patient account (auth user + profile) with email
// pre-confirmed server-side, so signup works without email delivery.
authRouter.post('/signup', authController.registerPatient);

// User is authenticated but may not have a profile yet.
authRouter.post('/profile', requireAuth, authController.createPatientProfile);
// NOTE: only requireAuth here (no requireProfile). /me must be reachable by an
// authenticated user who has NOT onboarded yet so it can return { profile: null }
// and the frontend can route them into profile creation.
authRouter.get('/me', requireAuth, authController.getMe);

export default authRouter;
