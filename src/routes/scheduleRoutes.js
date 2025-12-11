import express from "express";
import { getAll, getNow } from "../controllers/scheduleController.js";

const router = express.Router();

router.get("/", getAll);
router.get("/now", getNow);

export default router;