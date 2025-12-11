import express from "express";
import {
  getShows,
  createShow,
  updateShow,
  deleteShow,
  getLiveShow,        // ⭐ ADD THIS
} from "../controllers/showController.js";

const router = express.Router();

router.get("/", getShows);
router.get("/live", getLiveShow);   // ⭐ ADD THIS
router.post("/", createShow);
router.put("/:id", updateShow);
router.delete("/:id", deleteShow);

export default router;