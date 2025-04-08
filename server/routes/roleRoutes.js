
import express from 'express';
import { createRole } from '../controllers/roleController.js'; // make sure path is correct

const router = express.Router();

router.post('/', createRole);

export default router;
