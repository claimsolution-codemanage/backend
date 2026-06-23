import express from 'express';
const router = express.Router();
import * as employeeMailController from '../../controller/mail/employeeMailController.js'
import { authEmployee } from '../../middleware/authentication.js';

router.use(authEmployee)
router.post('/send-mass-mail', authEmployee, employeeMailController.sendMassMail)

export default router