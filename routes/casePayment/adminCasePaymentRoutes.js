import express from 'express';
const router = express.Router();
import * as adminCasePaymentDetailController from '../../controller/casePaymentDetail/adminCasePaymentDetailController.js'
import { authAdmin } from '../../middleware/authentication.js';

router.use(authAdmin)
router.post('/add', adminCasePaymentDetailController.createCasePayment)
router.get('/list', adminCasePaymentDetailController.getCasePaymentList)
router.get('/detail/:_id', adminCasePaymentDetailController.getCasePaymentById)
router.put('/update/detail/:_id', adminCasePaymentDetailController.updateCasePaymentDetails)
router.post('/schedule/payment', adminCasePaymentDetailController.payCasePaymentSchedule)
router.post('/schedule/add-payment/:_id', adminCasePaymentDetailController.addPaymentSchedule)

export default router
