import {Router} from 'express';
import * as doctorController from '../controllers/doctor.controller';

const doctorRouter = Router();

doctorRouter.post('/apply', doctorController.registerDoctor);
doctorRouter.get('/:id', doctorController.getDoctorById);

export default doctorRouter;