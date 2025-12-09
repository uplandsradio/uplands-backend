import { DataTypes } from "sequelize";
import sequelize from "../db.js";

export const NowPlaying = sequelize.define("NowPlaying", {
  showName: { type: DataTypes.STRING, allowNull: false },
  presenters: { type: DataTypes.STRING, allowNull: false },
  startTime: { type: DataTypes.TIME, allowNull: false },
  endTime: { type: DataTypes.TIME, allowNull: false },
  day: { type: DataTypes.STRING, allowNull: false }
});