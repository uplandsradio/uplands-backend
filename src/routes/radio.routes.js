import express from "express";
import { getNowPlaying } from "../controllers/radio.controller.js";

const router = express.Router();
router.get("/now-playing", getNowPlaying);
export default router;