import express from "express";
import {
  getPresenters,
  createPresenter,
  updatePresenter,
  deletePresenter,
} from "../controllers/presenterController.js";

const router = express.Router();

router.get("/", getPresenters);
router.post("/", createPresenter);
router.put("/:id", updatePresenter);
router.delete("/:id", deletePresenter);

export default router;