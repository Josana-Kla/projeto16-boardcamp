import express from 'express';
import { getRentals, createRentals, updateRentals, deleteRentals } from '../controllers/rentals.controller.js';

const router = express.Router();

router.get("/rentals", getRentals);
router.post("/rentals", createRentals);
router.put("/rentals/:id/return", updateRentals);
router.delete("/rentals/:id", deleteRentals);

export default router;