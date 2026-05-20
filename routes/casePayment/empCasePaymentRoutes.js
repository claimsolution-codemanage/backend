import express from 'express';
const router = express.Router();
import * as empCasePaymentDetailController from '../../controller/casePaymentDetail/empCasePaymentDetailController.js'
import { authEmployee } from '../../middleware/authentication.js';

router.use(authEmployee)
router.post('/add', empCasePaymentDetailController.createCasePayment)
router.get('/list', empCasePaymentDetailController.getCasePaymentList)
router.get('/detail/:_id', empCasePaymentDetailController.getCasePaymentById)
router.put('/update/detail/:_id', empCasePaymentDetailController.updateCasePaymentDetails)
router.post('/schedule/payment', empCasePaymentDetailController.payCasePaymentSchedule)
router.post('/schedule/add-payment/:_id', empCasePaymentDetailController.addPaymentSchedule)

export default router
