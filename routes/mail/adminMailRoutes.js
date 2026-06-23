import express from 'express';
const router = express.Router();
import * as adminMailController from '../../controller/mail/adminMailController.js'
import { authAdmin } from '../../middleware/authentication.js';

router.use(authAdmin)
router.post('/send-mass-mail', authAdmin, adminMailController.sendMassMail)

export default router