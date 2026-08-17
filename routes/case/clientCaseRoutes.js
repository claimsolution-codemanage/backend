import express from 'express';
const router = express.Router();
import { authClientNext } from "../../middleware/authentication.js"
import * as clientCaseContoller from "../../controller/case/clientCasesController.js"


router.post("/addNewClientCase", authClientNext, clientCaseContoller.addNewClientCase)
router.post("/addCaseFile", clientCaseContoller.clientAddCaseFile)
router.get("/viewClientCaseById", clientCaseContoller.viewClientCaseById)
router.get("/viewCaseDocsById/:_id", clientCaseContoller.viewCaseDocsById)
router.get("/viewCaseProcessStepsById/:_id", clientCaseContoller.viewCaseProcessStepsById)
router.get("/viewClientAllCase", clientCaseContoller.viewClientAllCase)

export default router
