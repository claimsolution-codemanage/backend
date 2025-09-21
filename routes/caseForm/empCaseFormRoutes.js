import express from 'express';
const router = express.Router();
import * as employeeCaseFormController from '../../controller/caseForm/employeeCaseFormController.js'
import { authEmployee } from '../../middleware/authentication.js';

router.use(authEmployee)
router.post('/createOrUpdateCaseForm',employeeCaseFormController.empCreateOrUpdateCaseForm)
router.get('/getCaseFormById/:formId/:caseId',employeeCaseFormController.empGetCaseFormById)

export default router
