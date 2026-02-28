const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("./db");

const authRoutes = require("./routes/auth");
const plantRoutes = require("./routes/plants");

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// routes
app.use("/api", authRoutes);
app.use("/api", plantRoutes);

// test route (optional but useful)
app.get("/", (req, res) => {
  res.send("Backend is running");
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
