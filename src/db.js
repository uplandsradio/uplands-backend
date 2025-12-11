// config/sequelize.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,          // ku-disable SQL logs
  dialectOptions: {
    ssl: {
      require: true,       // required kwa Render Postgres
      rejectUnauthorized: false, // bypass certificate verification
    },
  },
});

sequelize.authenticate()
  .then(() => console.log("✅ Connected to PostgreSQL via Sequelize..."))
  .catch(err => console.error("❌ Unable to connect to PostgreSQL:", err));

export default sequelize;