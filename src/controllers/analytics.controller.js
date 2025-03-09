const Analytics = require("../models/analytics.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");
const Product = require("../models/product.model");

// Helper function to get date range
const getDateRange = (range) => {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 30); // Default to last 30 days
  }

  return { start, end };
};

// @desc    Get dashboard statistics
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1);

    // Get key metrics
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments();

    // Revenue statistics
    const revenueStats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
          maxOrderValue: { $max: "$totalAmount" },
        },
      },
    ]);

    // Monthly revenue trend
    const monthlyRevenue = await Order.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]);

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalOrders,
          totalProducts,
          totalUsers,
          revenue: revenueStats[0] || { totalRevenue: 0, averageOrderValue: 0 },
        },
        trends: {
          monthlyRevenue,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get sales analytics
// @route   GET /api/analytics/sales
// @access  Private/Admin
exports.getSalesAnalytics = async (req, res, next) => {
  try {
    // Sales by product category
    const salesByCategory = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $group: {
          _id: "$productInfo.category",
          totalSales: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
    ]);

    // Sales by time of day
    const salesByHour = await Order.aggregate([
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        categoryAnalytics: salesByCategory,
        hourlyDistribution: salesByHour,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get product analytics
// @route   GET /api/analytics/products
// @access  Private/Admin
exports.getProductAnalytics = async (req, res, next) => {
  try {
    // Most viewed products
    const topViewedProducts = await Analytics.aggregate([
      { $match: { type: "product_view" } },
      {
        $group: {
          _id: "$productId",
          viewCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $sort: { viewCount: -1 } },
      { $limit: 10 },
    ]);

    // Product conversion rates
    const productConversion = await Analytics.aggregate([
      {
        $facet: {
          views: [
            { $match: { type: "product_view" } },
            { $group: { _id: "$productId", views: { $sum: 1 } } },
          ],
          purchases: [
            { $match: { type: "purchase" } },
            { $group: { _id: "$productId", purchases: { $sum: 1 } } },
          ],
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        topProducts: topViewedProducts,
        conversionRates: productConversion,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user analytics
// @route   GET /api/analytics/users
// @access  Private/Admin
exports.getUserAnalytics = async (req, res, next) => {
  try {
    // User registration trend
    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          newUsers: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]);

    // User engagement metrics
    const userEngagement = await Analytics.aggregate([
      {
        $group: {
          _id: "$userId",
          totalSessions: { $sum: 1 },
          avgSessionDuration: { $avg: "$sessionDuration" },
          lastActive: { $max: "$createdAt" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        growth: userGrowth,
        engagement: userEngagement,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get traffic analytics
// @route   GET /api/analytics/traffic
// @access  Private/Admin
exports.getTrafficAnalytics = async (req, res, next) => {
  try {
    // Page views by URL
    const pageViews = await Analytics.aggregate([
      { $match: { type: "pageview" } },
      {
        $group: {
          _id: "$url",
          views: { $sum: 1 },
          uniqueVisitors: { $addToSet: "$userId" },
        },
      },
      {
        $project: {
          url: "$_id",
          views: 1,
          uniqueVisitors: { $size: "$uniqueVisitors" },
        },
      },
    ]);

    // Traffic sources
    const trafficSources = await Analytics.aggregate([
      { $match: { type: "pageview" } },
      {
        $group: {
          _id: "$referrer",
          visits: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        pageViews,
        trafficSources,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get cart analytics
// @route   GET /api/analytics/cart
// @access  Private/Admin
exports.getCartAnalytics = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req.query.range);

    const cartData = await Analytics.find({
      date: { $gte: start, $lte: end },
    })
      .select("date cart")
      .sort("date");

    res.status(200).json({
      success: true,
      data: cartData,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get discount analytics
// @route   GET /api/analytics/discounts
// @access  Private/Admin
exports.getDiscountAnalytics = async (req, res, next) => {
  try {
    const { start, end } = getDateRange(req.query.range);

    const discountData = await Analytics.find({
      date: { $gte: start, $lte: end },
    })
      .select("date discounts")
      .sort("date");

    res.status(200).json({
      success: true,
      data: discountData,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Track page view
// @route   POST /api/analytics/track/pageview
// @access  Public
exports.trackPageView = async (req, res, next) => {
  try {
    const { url, referrer, userId } = req.body;

    await Analytics.create({
      type: "pageview",
      url,
      referrer,
      userId,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Page view tracked",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Track product view
// @route   POST /api/analytics/track/product/:id
// @access  Public
exports.trackProductView = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    await Analytics.create({
      type: "product_view",
      productId: id,
      userId,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Product view tracked",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Track cart action
// @route   POST /api/analytics/track/cart/:action
// @access  Private/Admin
exports.trackCartAction = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({ date: today });

    if (!analytics) {
      analytics = await Analytics.create({ date: today });
    }

    switch (req.params.action) {
      case "created":
        analytics.cart.created += 1;
        break;
      case "abandoned":
        analytics.cart.abandoned += 1;
        break;
      case "converted":
        analytics.cart.converted += 1;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid cart action",
        });
    }

    await analytics.save();

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
};
