import express from 'express';
const router = express.Router();
import * as adminStatementController from '../../controller/statement/adminStatement.js'
import { authAdmin } from '../../middleware/authentication.js';

// for statement
router.use(authAdmin)
router.post("/createOrUpdate", adminStatementController.bulkCreateOrUpdateStatement)
router.get("/all", adminStatementController.getStatement)
router.get("/downloadAll", adminStatementController.adminDownloadAllStatement)
router.get("/getStatements", adminStatementController.getAllStatement)
router.put("/changeStatus", adminStatementController.adminChangeStatementStatus)
router.delete("/delete", adminStatementController.deleteStatement)

export default router