import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth, requireProfile } from '../middleware/auth.middleware';
const authRouter = Router();

// User is authenticated but may not have a profile yet.
authRouter.post('/profile', requireAuth, authController.createPatientProfile);
authRouter.get('/me', requireAuth, requireProfile, authController.getMe);

export default authRouter;
