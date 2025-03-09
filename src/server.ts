import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import { errorHandler } from "./middleware/error.middleware";
import path from "path";

// Load env vars
dotenv.config();

// Route files
import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";
import cartRoutes from "./routes/cart.routes";
import analyticsRoutes from "./routes/analytics.routes";

const app: Application = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Set static folder
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Mount routers
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/analytics", analyticsRoutes);

// Error handler
app.use(errorHandler);

// Connect to database
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => {
    console.log("MongoDB Connected...");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
  });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});
