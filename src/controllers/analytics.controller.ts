import type {
  Request,
  Response,
  NextFunction,
} from "express-serve-static-core";
import type { ParsedQs } from "qs";
import Analytics from "../models/analytics.model";
import Order from "../models/order.model";
import User from "../models/user.model";
import Product from "../models/product.model";
import { AppError } from "../middleware/error.middleware";

interface AnalyticsQuery extends ParsedQs {
  range?: string;
}

interface PageViewBody {
  url: string;
  referrer?: string;
  userId?: string;
}

interface ProductViewBody {
  userId?: string;
}

// Helper function to get date range
const getDateRange = (
  range: string | undefined
): { startDate: Date; endDate: Date } => {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case "day":
      startDate.setDate(endDate.getDate() - 1);
      break;
    case "week":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 1); // Default to day
  }

  return { startDate, endDate };
};

// @desc    Get analytics data
// @route   GET /api/analytics
// @access  Private/Admin
export const getAnalytics = async (
  req: Request<Record<string, never>, unknown, unknown, AnalyticsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { range = "day" } = req.query;
    const { startDate, endDate } = getDateRange(range as string);

    const analytics = await Analytics.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ date: 1 });

    const summary = {
      totalSales: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      userRegistrations: 0,
      conversionRate: 0,
    };

    analytics.forEach((record) => {
      summary.totalSales += record.totalSales;
      summary.totalOrders += record.totalOrders;
      summary.userRegistrations += record.userRegistrations;
    });

    summary.averageOrderValue =
      summary.totalOrders > 0 ? summary.totalSales / summary.totalOrders : 0;

    res.status(200).json({
      success: true,
      data: {
        summary,
        analytics,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate daily analytics
// @route   POST /api/analytics/generate
// @access  Private/Admin
export const generateAnalytics = async (
  req: Request<Record<string, never>, unknown, unknown, unknown>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get orders for today
    const orders = await Order.find({
      createdAt: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    // Calculate analytics data
    const totalSales = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Get new user registrations
    const userRegistrations = await User.countDocuments({
      createdAt: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    // Calculate conversion rate (orders / user visits)
    const totalVisits = await User.countDocuments({
      lastVisit: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });
    const conversionRate =
      totalVisits > 0 ? (totalOrders / totalVisits) * 100 : 0;

    // Create or update analytics record
    const analytics = await Analytics.findOneAndUpdate(
      { date: today },
      {
        totalSales,
        totalOrders,
        averageOrderValue,
        userRegistrations,
        conversionRate,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
export const getDashboardStats = async (
  req: Request<Record<string, never>, unknown, unknown, unknown>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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
export const getSalesAnalytics = async (
  req: Request<Record<string, never>, unknown, unknown, unknown>,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
export const getProductAnalytics = async (
  req: Request<Record<string, never>, unknown, unknown, unknown>,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
export const getUserAnalytics = async (
  req: Request<Record<string, never>, unknown, unknown, unknown>,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
export const getTrafficAnalytics = async (
  req: Request<Record<string, never>, unknown, unknown, unknown>,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
export const getCartAnalytics = async (
  req: Request<Record<string, never>, unknown, unknown, AnalyticsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = getDateRange(req.query.range);

    const cartData = await Analytics.find({
      date: { $gte: startDate, $lte: endDate },
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
export const getDiscountAnalytics = async (
  req: Request<Record<string, never>, unknown, unknown, AnalyticsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = getDateRange(req.query.range);

    const discountData = await Analytics.find({
      date: { $gte: startDate, $lte: endDate },
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
export const trackPageView = async (
  req: Request<Record<string, never>, unknown, PageViewBody, unknown>,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
export const trackProductView = async (
  req: Request<{ id: string }, unknown, ProductViewBody, unknown>,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
export const trackCartAction = async (
  req: Request<
    { action: "created" | "abandoned" | "converted" },
    unknown,
    unknown,
    unknown
  >,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let analytics = await Analytics.findOne({ date: today });

    if (!analytics) {
      analytics = await Analytics.create({
        date: today,
        cart: { created: 0, abandoned: 0, converted: 0 },
      });
    }

    if (!analytics.cart) {
      analytics.cart = { created: 0, abandoned: 0, converted: 0 };
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
        throw new AppError("Invalid cart action", 400);
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
