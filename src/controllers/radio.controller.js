import { NowPlaying } from "../models/NowPlaying.js";
import { Op } from "sequelize";

export const getNowPlaying = async (req, res) => {
  try {
    const now = new Date();
    const day = now.toLocaleString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().split(" ")[0];

    const show = await NowPlaying.findOne({
      where: {
        day,
        startTime: { [Op.lte]: currentTime },
        endTime: { [Op.gte]: currentTime }
      }
    });

    res.json(show || { showName: "Uplands FM", presenters: "DJ Ben & Miss Glory" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};