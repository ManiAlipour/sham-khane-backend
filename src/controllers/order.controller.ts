import { validationResult } from "express-validator";
import type {
  Request,
  Response,
  NextFunction,
} from "express-serve-static-core";
import Order, { IOrder, IOrderItem } from "../models/order.model";
import Product from "../models/product.model";
import type { IUser } from "../types/models";
import mongoose from "mongoose";

interface AuthenticatedRequest extends Omit<Request, "user"> {
  user: {
    id: IUser["_id"];
    role: IUser["role"];
  };
}

interface OrderQuery {
  page?: string;
  limit?: string;
  status?: IOrder["orderStatus"];
  sort?: string;
}

interface CreateOrderBody {
  items: Array<{
    product: string;
    quantity: number;
  }>;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
}

interface UpdateOrderBody {
  status?: IOrder["orderStatus"];
  paymentStatus?: IOrder["paymentStatus"];
}

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
export const getOrders = async (
  req: Request<Record<string, never>, unknown, unknown, OrderQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Order.countDocuments();

    const query = Order.find()
      .populate({
        path: "user",
        select: "name email",
      })
      .populate({
        path: "items.product",
        select: "name price",
      });

    // Filtering
    if (req.query.status) {
      query.where("orderStatus").equals(req.query.status);
    }

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query.sort(sortBy);
    } else {
      query.sort("-createdAt");
    }

    // Pagination
    query.skip(startIndex).limit(limit);

    const orders = await query;

    // Pagination result
    const pagination: {
      next?: { page: number; limit: number };
      prev?: { page: number; limit: number };
    } = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination,
      data: orders,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = async (
  req: AuthenticatedRequest & { params: { id: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate({
        path: "user",
        select: "name email",
      })
      .populate({
        path: "items.product",
        select: "name price",
      });

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    // Make sure user is order owner
    if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
      res.status(401).json({
        success: false,
        message: "Not authorized to access this order",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Create order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (
  req: AuthenticatedRequest & { body: CreateOrderBody },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    // Calculate total amount and validate products
    let totalAmount = 0;
    const orderItems: IOrderItem[] = [];

    for (const item of req.body.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        res.status(404).json({
          success: false,
          message: `Product not found with id ${item.product}`,
        });
        return;
      }

      orderItems.push({
        product: new mongoose.Types.ObjectId(item.product),
        quantity: item.quantity,
        price: product.price,
      });

      totalAmount += product.price * item.quantity;
    }

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      totalAmount,
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
    });

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
      return;
    }
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private
export const updateOrder = async (
  req: AuthenticatedRequest & {
    params: { id: string };
    body: UpdateOrderBody;
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    // Make sure user is order owner or admin
    if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
      res.status(401).json({
        success: false,
        message: "Not authorized to update this order",
      });
      return;
    }

    // Only allow updating status and payment status
    const allowedUpdates = ["orderStatus", "paymentStatus"];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every((update) =>
      allowedUpdates.includes(update)
    );

    if (!isValidOperation) {
      res.status(400).json({
        success: false,
        message: "Invalid updates",
      });
      return;
    }

    order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
      return;
    }
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private
export const deleteOrder = async (
  req: AuthenticatedRequest & { params: { id: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    // Make sure user is order owner or admin
    if (order.user.toString() !== req.user.id && req.user.role !== "admin") {
      res.status(401).json({
        success: false,
        message: "Not authorized to delete this order",
      });
      return;
    }

    await order.deleteOne();

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/user/me
// @access  Private
export const getUserOrders = async (
  req: AuthenticatedRequest & { query: OrderQuery },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Order.countDocuments({ user: req.user.id });

    const query = Order.find({ user: req.user.id })
      .populate({
        path: "items.product",
        select: "name price",
      })
      .sort("-createdAt")
      .skip(startIndex)
      .limit(limit);

    const orders = await query;

    // Pagination result
    const pagination: {
      next?: { page: number; limit: number };
      prev?: { page: number; limit: number };
    } = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination,
      data: orders,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};
