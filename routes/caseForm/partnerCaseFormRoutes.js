import express from 'express';
const router = express.Router();
import * as PartnerCaseFormController from '../../controller/caseForm/partnerCaseFormController.js'

router.get('/getCaseFormById/:formId/:caseId',PartnerCaseFormController.partnerGetCaseFormById)

export default router
