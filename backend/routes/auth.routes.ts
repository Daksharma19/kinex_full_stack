import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
const authRouter = Router();

authRouter.post('/profile', authController.createPatientProfile);
authRouter.get('/me', authController.getMe);

export default authRouter;
