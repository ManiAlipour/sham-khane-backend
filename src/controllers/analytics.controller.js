const Analytics = require("../models/analytics.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");

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
    const { start, end } = getDateRange(req.query.range);

    const analytics = await Analytics.find({
      date: { $gte: start, $lte: end },
    }).sort("date");

    // Calculate summary statistics
    const summary = {
      totalSales: analytics.reduce((acc, day) => acc + day.sales.total, 0),
      totalOrders: analytics.reduce((acc, day) => acc + day.sales.count, 0),
      averageOrderValue: 0,
      newUsers: analytics.reduce(
        (acc, day) => acc + day.users.newRegistrations,
        0
      ),
      pageViews: analytics.reduce((acc, day) => acc + day.traffic.pageViews, 0),
      conversionRate: 0,
    };

    // Calculate averages
    if (summary.totalOrders > 0) {
      summary.averageOrderValue = summary.totalSales / summary.totalOrders;
    }

    const totalVisitors = analytics.reduce(
      (acc, day) => acc + day.traffic.uniqueVisitors,
      0
    );
    if (totalVisitors > 0) {
      summary.conversionRate = (summary.totalOrders / totalVisitors) * 100;
    }

    res.status(200).json({
      success: true,
      data: {
        summary,
        dailyData: analytics,
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
    const { start, end } = getDateRange(req.query.range);

    const salesData = await Analytics.find({
      date: { $gte: start, $lte: end },
    })
      .select("date sales")
      .sort("date");

    res.status(200).json({
      success: true,
      data: salesData,
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
    const { start, end } = getDateRange(req.query.range);

    const productData = await Analytics.find({
      date: { $gte: start, $lte: end },
    })
      .select("date products")
      .populate("products.viewed.product products.purchased.product", "name")
      .sort("date");

    res.status(200).json({
      success: true,
      data: productData,
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
    const { start, end } = getDateRange(req.query.range);

    const userData = await Analytics.find({
      date: { $gte: start, $lte: end },
    })
      .select("date users")
      .sort("date");

    res.status(200).json({
      success: true,
      data: userData,
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
    const { start, end } = getDateRange(req.query.range);

    const trafficData = await Analytics.find({
      date: { $gte: start, $lte: end },
    })
      .select("date traffic")
      .sort("date");

    res.status(200).json({
      success: true,
      data: trafficData,
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
// @access  Private/Admin
exports.trackPageView = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({ date: today });

    if (!analytics) {
      analytics = await Analytics.create({ date: today });
    }

    analytics.traffic.pageViews += 1;
    if (req.body.isUnique) {
      analytics.traffic.uniqueVisitors += 1;
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

// @desc    Track product view
// @route   POST /api/analytics/track/product/:id
// @access  Private/Admin
exports.trackProductView = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({ date: today });

    if (!analytics) {
      analytics = await Analytics.create({ date: today });
    }

    const productIndex = analytics.products.viewed.findIndex(
      (item) => item.product.toString() === req.params.id
    );

    if (productIndex > -1) {
      analytics.products.viewed[productIndex].count += 1;
    } else {
      analytics.products.viewed.push({
        product: req.params.id,
        count: 1,
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
