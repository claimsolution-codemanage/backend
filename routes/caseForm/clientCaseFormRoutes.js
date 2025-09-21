import express from 'express';
const router = express.Router();
import * as clientCaseFormController from '../../controller/caseForm/clientCaseFormController.js'

router.get('/getCaseFormById/:formId/:caseId',clientCaseFormController.clientGetCaseFormById)

export default router
