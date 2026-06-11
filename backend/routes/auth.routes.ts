import {Router} from 'express';
import * as authController from '../controllers/auth.controller';
const authRouter = Router();

authRouter.post('/register-patient',authController.registerPatient);
authRouter.post('/login',authController.login);
authRouter.get('/me',authController.getMe);

export default authRouter;  