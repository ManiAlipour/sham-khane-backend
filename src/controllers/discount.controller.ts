import { validationResult } from "express-validator";
import type {
  Request,
  Response,
  NextFunction,
} from "express-serve-static-core";
import Discount, { IDiscount } from "../models/discount.model";
import type { IUser } from "../types/models";
import mongoose from "mongoose";

interface AuthenticatedRequest extends Omit<Request, "user"> {
  user: {
    id: IUser["_id"];
  };
}

interface ValidateDiscountBody {
  code: string;
  cartTotal?: number;
}

interface DiscountQuery {
  page?: string;
  limit?: string;
  isActive?: string;
  type?: "percentage" | "fixed";
  sort?: string;
}

// @desc    Get all discounts
// @route   GET /api/discounts
// @access  Private/Admin
export const getDiscounts = async (
  req: Request<Record<string, never>, unknown, unknown, DiscountQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Discount.countDocuments();

    const query = Discount.find();

    // Filtering
    if (req.query.isActive) {
      query.where("isActive").equals(req.query.isActive === "true");
    }
    if (req.query.type) {
      query.where("type").equals(req.query.type);
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

    const discounts = await query;

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
      count: discounts.length,
      pagination,
      data: discounts,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Get single discount
// @route   GET /api/discounts/:id
// @access  Private/Admin
export const getDiscount = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const discount = await Discount.findById(req.params.id);

    if (!discount) {
      res.status(404).json({
        success: false,
        message: "Discount not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: discount,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Create new discount
// @route   POST /api/discounts
// @access  Private/Admin
export const createDiscount = async (
  req: AuthenticatedRequest & { body: Partial<IDiscount> },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    // Add user to req.body
    req.body.createdBy = req.user.id;

    // Convert code to uppercase
    if (req.body.code) {
      req.body.code = req.body.code.toUpperCase();
    }

    const discount = await Discount.create(req.body);

    res.status(201).json({
      success: true,
      data: discount,
    });
  } catch (err) {
    // Handle duplicate code error
    if (err instanceof mongoose.Error.ValidationError) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
      return;
    }
    if (err instanceof Error && (err as any).code === 11000) {
      res.status(400).json({
        success: false,
        message: "Discount code already exists",
      });
      return;
    }
    next(err);
  }
};

// @desc    Update discount
// @route   PUT /api/discounts/:id
// @access  Private/Admin
export const updateDiscount = async (
  req: Request<{ id: string }, unknown, Partial<IDiscount>>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    let discount = await Discount.findById(req.params.id);

    if (!discount) {
      res.status(404).json({
        success: false,
        message: "Discount not found",
      });
      return;
    }

    // Convert code to uppercase if provided
    if (req.body.code) {
      req.body.code = req.body.code.toUpperCase();
    }

    discount = await Discount.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: discount,
    });
  } catch (err) {
    // Handle duplicate code error
    if (err instanceof mongoose.Error.ValidationError) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
      return;
    }
    if (err instanceof Error && (err as any).code === 11000) {
      res.status(400).json({
        success: false,
        message: "Discount code already exists",
      });
      return;
    }
    next(err);
  }
};

// @desc    Delete discount
// @route   DELETE /api/discounts/:id
// @access  Private/Admin
export const deleteDiscount = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const discount = await Discount.findById(req.params.id);

    if (!discount) {
      res.status(404).json({
        success: false,
        message: "Discount not found",
      });
      return;
    }

    await discount.deleteOne();

    res.status(200).json({
      success: true,
      message: "Discount deleted successfully",
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Validate discount code
// @route   POST /api/discounts/validate
// @access  Private
export const validateDiscount = async (
  req: Request<Record<string, never>, unknown, ValidateDiscountBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, cartTotal } = req.body;

    if (!code) {
      res.status(400).json({
        success: false,
        message: "Please provide a discount code",
      });
      return;
    }

    const discount = await Discount.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expiryDate: { $gt: Date.now() },
    });

    if (!discount) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired discount code",
      });
      return;
    }

    // Check minimum purchase requirement
    if (cartTotal && discount.minPurchase > cartTotal) {
      res.status(400).json({
        success: false,
        message: `Minimum purchase amount of ${discount.minPurchase} required`,
      });
      return;
    }

    // Check usage limit
    if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
      res.status(400).json({
        success: false,
        message: "Discount code usage limit reached",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: discount,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};
