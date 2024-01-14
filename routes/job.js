import express from 'express';
const router = express.Router();
import { allJob } from "../controller/job.js";

router.get("/all",allJob)

export default router