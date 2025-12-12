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

    // Only update what was sent
    const updateData = {
      name: req.body.name ?? show.name,
      host: req.body.host ?? show.host,
      startTime: req.body.startTime ?? show.startTime,
      endTime: req.body.endTime ?? show.endTime,
    };

    await show.update(updateData);

    res.json(show);
  } catch (err) {
    console.log("🔥 UPDATE SHOW ERROR:", err);
    res.status(500).json({ error: "Server error", details: err.message });
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