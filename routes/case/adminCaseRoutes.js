import express from 'express';
const router = express.Router();

import * as adminCaseController from '../../controller/case/adminCaseController.js'
import { authAdmin } from '../../middleware/authentication.js';

// for finance employee
router.use(authAdmin)
router.get("/viewAllCase", adminCaseController.viewAllAdminCase)
router.put("/changeCaseStatus", adminCaseController.changeStatusAdminCase)
router.get("/viewCaseById", adminCaseController.viewCaseByIdByAdmin)
router.post("/adminAddCaseFile", adminCaseController.adminAddCaseFile)
router.put("/updateCaseById", adminCaseController.adminUpdateCaseById)
router.post("/addOrUpdatePayment", adminCaseController.adminAddOrUpdatePayment)
router.put("/editCaseProcessById", adminCaseController.adminEditCaseStatus)
router.put("/addCaseFeeClient", adminCaseController.adminAddCaseFeeClient)
router.put("/updateClientCaseFee", adminCaseController.adminUpdateClientCaseFee)
router.put("/changeCaseIsActive", adminCaseController.adminSetIsActiveCase)
router.put("/addReferenceCaseAndMarge", adminCaseController.adminAddReferenceCaseAndMarge)
router.put("/removeReferenceCase", adminCaseController.adminRemoveReferenceCase)
router.delete("/deleteCaseById", adminCaseController.adminDeleteCaseById)
router.delete("/deleteCaseDocId", adminCaseController.adminDeleteCaseDocById)
router.put("/renameCaseDocFolder", adminCaseController.renameCaseDocFolder)

// comment
router.get("/viewCaseCommentsById/:caseId", adminCaseController.viewCaseCommentsById)
router.put("/add_or_update_case_comment", adminCaseController.adminAddOrUpdateCaseComment)
router.get("/getCaseEmployeeList/:caseId", adminCaseController.getCaseEmployeeList)
// comment

// share case to employee
router.put("/addEmployeeToCase", adminCaseController.adminShareCaseToEmployee)


export default router
