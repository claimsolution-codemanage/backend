import express from 'express';
const router = express.Router();
import { imageUpload } from '../controller/imageUpload.js';

router.post("/imageUpload",imageUpload)

export default router


