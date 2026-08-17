import express from 'express';
const router = express.Router();
import * as partnerCaseController from "../../controller/case/partnerCaseController.js"


router.post("/addNewCase", partnerCaseController.addNewCase)
router.get("/viewAllPartnerCase", partnerCaseController.viewAllPartnerCase)
router.get("/partnerViewCaseById", partnerCaseController.partnerViewCaseById)
router.post("/addCaseFile", partnerCaseController.partnerAddCaseFile)
router.get("/viewCaseDocsById/:_id", partnerCaseController.viewCaseDocsById)
router.get("/viewCaseProcessStepsById/:_id", partnerCaseController.viewCaseProcessStepsById)

export default router
