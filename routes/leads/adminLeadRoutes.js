import express from 'express';
const router = express.Router();
import * as adminLeadController from '../../controller/leads/adminLeadController.js'
import { authAdmin } from '../../middleware/authentication.js';
import leadQueryParser from '../../middleware/leadFilterMiddleware.js';

router.use(authAdmin)
router.post('/add-column', authAdmin, adminLeadController.createColumn)
router.put('/update-column', authAdmin, adminLeadController.createColumn)
router.get('/all-lead-column', authAdmin, adminLeadController.allLeadColumns)
router.post('/add-lead', authAdmin, adminLeadController.addNewLead)
router.put('/update-lead', authAdmin, adminLeadController.updateLead)
router.put('/add-or-update-lead', authAdmin, adminLeadController.addOrUpdateLead)
router.get('/all-leads', authAdmin, leadQueryParser, adminLeadController.allLeads)
router.delete('/delete-lead-by-id', authAdmin, adminLeadController.deleteLead)
router.post('/add-or-update-lead-follow-up', authAdmin, adminLeadController.addOrUpdateLeadFollowUp)
router.get('/get-lead-follow-ups/:leadId', authAdmin, adminLeadController.getLeadFollowUps)

export default router
