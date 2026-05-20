import express from 'express';
const router = express.Router();
import * as clientCasePaymentDetailController from '../../controller/casePaymentDetail/clientCasePaymentDetailController.js'
import { authClientNext } from '../../middleware/authentication.js';

router.use(authClientNext)
router.get('/list', clientCasePaymentDetailController.getCasePaymentList)
router.get('/detail/:_id', clientCasePaymentDetailController.getCasePaymentById)

export default router
