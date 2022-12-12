import express from 'express';
import { getCategories, createCategory } from '../controllers/categories.controller.js';

const router = express.Router();

router.get("/categories", getCategories);
router.post("/categories", createCategory);

export default router;