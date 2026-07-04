import express from 'express';
const router = express.Router();
import * as employeeStatementController from '../../controller/statement/empStatement.js'
import { authEmployee } from '../../middleware/authentication.js';

// for statement
router.use(authEmployee)
router.post("/createOrUpdate", employeeStatementController.bulkCreateOrUpdateStatement)
router.get("/all", employeeStatementController.getStatement)
router.get("/downloadAll", employeeStatementController.empDownloadAllStatement)
router.get("/getStatements", employeeStatementController.getAllStatement)
router.put("/changeStatus", employeeStatementController.empOpChangeStatementStatus)
router.delete("/delete", employeeStatementController.deleteStatement)

export default router
