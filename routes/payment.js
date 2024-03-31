import express from 'express';
const router = express.Router();
import { paymentWebHook,paymentCheckoutPage} from '../controller/payment.js';

router.post("/paymentWebHook",paymentWebHook)
// router.get("/paymentCheckoutPage",paymentCheckoutPage)
export default router