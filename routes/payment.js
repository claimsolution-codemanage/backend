import express from 'express';
const router = express.Router();
import { paymentWebHook } from '../controller/payment.js';

router.get("/paymentWebHook",paymentWebHook)
export default router