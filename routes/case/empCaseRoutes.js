import express from 'express';
const router = express.Router();

import * as employeeCaseController from '../../controller/case/employeeCaseController.js'
import { authEmployee } from '../../middleware/authentication.js';

// for finance employee
router.use(authEmployee)
router.get("/viewAllCase", employeeCaseController.viewAllCase)
router.get("/viewCaseById", employeeCaseController.viewCaseById)
router.put("/updateCaseById", employeeCaseController.updateCaseById)
router.put("/changeCaseIsActive", employeeCaseController.changeCaseIsActive)
router.post("/addCaseFile", employeeCaseController.addCaseFile)
router.get("/findCaseByFileNo", employeeCaseController.empFindCaseByFileNo)
router.put("/updateCaseStatus", employeeCaseController.updateCaseStatus)
router.put("/add_or_update_case_comment", employeeCaseController.empAddOrUpdateCaseComment)
router.put("/addReferenceCaseAndMarge", employeeCaseController.addReferenceCaseAndMarge)
router.put("/removeCaseReference", employeeCaseController.removeCaseReference)
router.post("/addOrUpdateCasePayment", employeeCaseController.addOrUpdateCasePayment)
router.delete("/deleteCaseById", employeeCaseController.deleteCaseById)
router.put("/renameCaseDocFolder", employeeCaseController.renameCaseDocFolder)

export default router
