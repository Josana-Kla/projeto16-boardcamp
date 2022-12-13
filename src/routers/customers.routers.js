import express from 'express';
import { getCustomers, createCustomers, getCustomersById, updateCustomers } from '../controllers/customers.controller.js';

const router = express.Router();

router.get("/customers", getCustomers);
router.post("/customers", createCustomers);
router.get("/customers/:id", getCustomersById);
router.put("/customers/:id", updateCustomers);

export default router;