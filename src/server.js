// src/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDB } from "./config/db.js";
import Product from "./models/Product.js";
import productRoutes from "./routes/productRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Base API route
app.use("/", productRoutes);

const PORT = process.env.PORT || 8000;

// Connect to PostgreSQL
const startServer = async () => {
  try {
    await connectDB();
    await Product.sync();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Server startup failed:", err.message);
    process.exit(1);
  }
};

startServer();
