import express from 'express';
const router = express.Router();
import * as adminCaseFormController from '../../controller/caseForm/adminCaseFormController.js'
import { authAdmin } from '../../middleware/authentication.js';

router.use(authAdmin)
router.post('/createOrUpdateCaseForm',adminCaseFormController.adminCreateOrUpdateCaseForm)
router.get('/getCaseFormById/:formId/:caseId',adminCaseFormController.adminGetCaseFormById)

export default router
