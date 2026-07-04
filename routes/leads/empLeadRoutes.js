import express from 'express';
const router = express.Router();
import * as employeeLeadController from '../../controller/leads/employeeLeadController.js'
import { authEmployee } from '../../middleware/authentication.js';
import leadQueryParser from '../../middleware/leadFilterMiddleware.js';

router.use(authEmployee)
router.post('/add-column', employeeLeadController.createColumn)
router.put('/update-column', employeeLeadController.updateColumn)
router.get('/all-lead-column', employeeLeadController.allLeadColumns)
router.post('/add-lead', employeeLeadController.addNewLead)
router.put('/update-lead', employeeLeadController.updateLead)
router.put('/add-or-update-lead', employeeLeadController.addOrUpdateLead)
router.get('/all-leads', leadQueryParser, employeeLeadController.allLeads)
router.post('/add-or-update-lead-followup', employeeLeadController.addOrUpdateLeadFollowUp)
router.get('/get-lead-follow-ups/:leadId', employeeLeadController.getLeadFollowUps)
router.delete('/delete-lead-by-id', employeeLeadController.deleteLead)
export default router
