const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");

const {
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
} = require("../controllers/analytics.controller");

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

module.exports = router;
