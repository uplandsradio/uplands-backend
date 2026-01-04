import axios from "axios";

export const streamHealth = async (req, res) => {
  try {
    const r = await axios.get(process.env.MAIN_STREAM_URL, {
      timeout: 5000,
      responseType: "stream", // avoid loading full mp3 in memory
    });

    return res.json({
      status: "LIVE",
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.json({
      status: "DOWN",
      checkedAt: new Date().toISOString(),
    });
  }
};