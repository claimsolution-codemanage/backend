import express from 'express';
const router = express.Router();
import { paymentWebHook,paymentCheckoutPage,paymentConfirmation } from '../controller/payment.js';

router.post("/paymentWebHook",paymentWebHook)
router.get("/paymentCheckoutPage",paymentCheckoutPage)
router.get("/confirmation",paymentConfirmation)
export default router