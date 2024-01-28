import express from 'express';
const router = express.Router();
import { addComplaint,} from '../controller/complaint.js';

router.post("/add",addComplaint)


export default router