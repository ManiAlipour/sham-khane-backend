import * as express from "express";
import { protect, authorize } from "../middleware/auth.middleware";
import {
  getDashboardStats,
  getSalesAnalytics,
  getProductAnalytics,
  getUserAnalytics,
  getTrafficAnalytics,
  getCartAnalytics,
  getDiscountAnalytics,
  trackPageView,
  trackProductView,
  trackCartAction,
} from "../controllers/analytics.controller";

const router = express.Router();

// All routes require authentication and admin access
router.use(protect);
router.use(authorize("admin"));

// Dashboard and analytics routes
router.get("/dashboard", getDashboardStats);
router.get("/sales", getSalesAnalytics);
router.get("/products", getProductAnalytics);
router.get("/users", getUserAnalytics);
router.get("/traffic", getTrafficAnalytics);
router.get("/cart", getCartAnalytics);
router.get("/discounts", getDiscountAnalytics);

// Tracking routes
router.post("/track/pageview", trackPageView);
router.post("/track/product/:id", trackProductView);
router.post("/track/cart/:action", trackCartAction);

export default router;
