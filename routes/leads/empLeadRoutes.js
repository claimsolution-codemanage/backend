import express from 'express';
const router = express.Router();
import * as employeeLeadController from '../../controller/leads/employeeLeadController.js'
import { authEmployee } from '../../middleware/authentication.js';
import leadQueryParser from '../../middleware/leadFilterMiddleware.js';

router.use(authEmployee)
router.post('/add-column',authEmployee,employeeLeadController.createColumn)
router.get('/all-lead-column',authEmployee,employeeLeadController.allLeadColumns)
router.post('/add-lead',authEmployee,employeeLeadController.addNewLead)
router.put('/update-lead',authEmployee,employeeLeadController.updateLead)
router.put('/add-or-update-lead',authEmployee,employeeLeadController.addOrUpdateLead)
router.get('/all-leads',authEmployee,leadQueryParser,employeeLeadController.allLeads)
router.delete('/delete-lead-by-id',authEmployee,employeeLeadController.deleteLead)
export default router
