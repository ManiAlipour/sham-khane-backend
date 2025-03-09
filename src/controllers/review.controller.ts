import { validationResult } from "express-validator";
import type {
  Request,
  Response,
  NextFunction,
} from "express-serve-static-core";
import Review from "../models/review.model";
import Product from "../models/product.model";
import type { IUser } from "../types/models";
import mongoose from "mongoose";

interface AuthenticatedRequest extends Omit<Request, "user"> {
  user: {
    id: IUser["_id"];
    role: IUser["role"];
  };
}

interface ReviewQuery {
  page?: string;
  limit?: string;
  rating?: string;
  sort?: string;
}

interface ReviewBody {
  product: string;
  rating: number;
  comment: string;
}

// @desc    Get all reviews
// @route   GET /api/reviews
// @access  Public
export const getReviews = async (
  req: Request<Record<string, never>, unknown, unknown, ReviewQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Review.countDocuments();

    const query = Review.find()
      .populate({
        path: "user",
        select: "name",
      })
      .populate({
        path: "product",
        select: "name",
      });

    // Filtering
    if (req.query.rating) {
      query.where("rating").equals(parseInt(req.query.rating, 10));
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

    const reviews = await query;

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
      count: reviews.length,
      pagination,
      data: reviews,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
export const getReview = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const review = await Review.findById(req.params.id)
      .populate({
        path: "user",
        select: "name",
      })
      .populate({
        path: "product",
        select: "name",
      });

    if (!review) {
      res.status(404).json({
        success: false,
        message: "Review not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Add review
// @route   POST /api/reviews
// @access  Private
export const addReview = async (
  req: AuthenticatedRequest & { body: ReviewBody },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    // Check if product exists
    const product = await Product.findById(req.body.product);
    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      user: req.user.id,
      product: req.body.product,
    });

    if (existingReview) {
      res.status(400).json({
        success: false,
        message: "You have already reviewed this product",
      });
      return;
    }

    const review = await Review.create({
      ...req.body,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: review,
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

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview = async (
  req: AuthenticatedRequest & {
    params: { id: string };
    body: Partial<ReviewBody>;
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    let review = await Review.findById(req.params.id);

    if (!review) {
      res.status(404).json({
        success: false,
        message: "Review not found",
      });
      return;
    }

    // Make sure user is review owner
    if (review.user.toString() !== req.user.id) {
      res.status(401).json({
        success: false,
        message: "Not authorized to update this review",
      });
      return;
    }

    review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: review,
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

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview = async (
  req: AuthenticatedRequest & { params: { id: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      res.status(404).json({
        success: false,
        message: "Review not found",
      });
      return;
    }

    // Make sure user is review owner
    if (review.user.toString() !== req.user.id) {
      res.status(401).json({
        success: false,
        message: "Not authorized to delete this review",
      });
      return;
    }

    await review.deleteOne();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Get product reviews
// @route   GET /api/reviews/product/:productId
// @access  Public
export const getProductReviews = async (
  req: Request<{ productId: string }, unknown, unknown, ReviewQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Review.countDocuments({
      product: req.params.productId,
    });

    const reviews = await Review.find({ product: req.params.productId })
      .populate({
        path: "user",
        select: "name",
      })
      .sort("-createdAt")
      .skip(startIndex)
      .limit(limit);

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
      count: reviews.length,
      pagination,
      data: reviews,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};
