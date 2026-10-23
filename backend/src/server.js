

const issuesRouter = require("./routes/issues");
const pool = require("./config/db");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use("/api/issues", issuesRouter);

app.get("/", (req, res) => {
  res.json({
    message: "CampusFix backend is running successfully!",
  });
});


app.get("/api/health/db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS time");

    res.json({
      message: "Database connected successfully!",
      time: result.rows[0].time,
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    res.status(500).json({
      message: "Database connection failed. Check the backend terminal.",
    });
  }
});


app.listen(PORT, () => {
  console.log(`CampusFix backend running at http://localhost:${PORT}`);
});
