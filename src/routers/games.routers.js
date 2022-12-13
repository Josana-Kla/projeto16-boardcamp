import express from 'express';
import { getGames, createGames } from '../controllers/games.controllers.js';

const router = express.Router();

router.get("/games", getGames);
router.post("/games", createGames);

export default router;