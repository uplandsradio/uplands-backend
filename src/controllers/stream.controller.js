import axios from "axios";

export const streamHealth = async (req, res) => {
  try {
    await axios.head(process.env.MAIN_STREAM_URL, {
      timeout: 3000,
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