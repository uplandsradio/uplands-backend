import { Show } from "../models/Show.js";
import { Op } from "sequelize";

// GET all shows
export const getShows = async (req, res) => {
  try {
    const shows = await Show.findAll();
    res.json(shows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// CREATE show
export const createShow = async (req, res) => {
  try {
    const show = await Show.create(req.body);
    res.json(show);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// UPDATE show
export const updateShow = async (req, res) => {
  try {
    const show = await Show.findByPk(req.params.id);
    if (!show) return res.status(404).json({ error: "Show not found" });

    await show.update(req.body);
    res.json(show);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE show
export const deleteShow = async (req, res) => {
  try {
    const show = await Show.findByPk(req.params.id);
    if (!show) return res.status(404).json({ error: "Show not found" });

    await show.destroy();
    res.json({ message: "Show deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// ⭐ NEW: GET LIVE SHOW (real-time)
export const getLiveShow = async (req, res) => {
  try {
    const now = new Date();

    const show = await Show.findOne({
      where: {
        startTime: { [Op.lte]: now },
        endTime: { [Op.gte]: now },
      },
    });

    if (!show) {
      return res.json({
        showName: null,
        hostName: null,
        startTime: null,
        endTime: null,
      });
    }

    res.json({
      showName: show.name,
      hostName: show.host,
      startTime: show.startTime,
      endTime: show.endTime,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};