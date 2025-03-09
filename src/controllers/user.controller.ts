import { validationResult } from "express-validator";
import type {
  Request,
  Response,
  NextFunction,
} from "express-serve-static-core";
import User from "../models/user.model";
import { IUser } from "../types/models";

interface UserQuery {
  page?: string;
  limit?: string;
  role?: "user" | "admin";
  isEmailVerified?: string;
  sort?: string;
}

interface UserUpdateBody {
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (
  req: Request<Record<string, never>, unknown, unknown, UserQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await User.countDocuments();

    const query = User.find().select("-password");

    // Filtering
    if (req.query.role) {
      query.where("role").equals(req.query.role);
    }
    if (req.query.isEmailVerified) {
      query
        .where("isEmailVerified")
        .equals(req.query.isEmailVerified === "true");
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

    const users = await query;

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
      count: users.length,
      pagination,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUser = async (
  req: Request<{ id: string }, unknown, unknown>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (
  req: Request<{ id: string }, unknown, UserUpdateBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Prevent admin role modification through this route
    if ("role" in req.body) {
      delete (req.body as any).role;
    }

    // Check if email is being changed and if it's already in use
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        res.status(400).json({
          success: false,
          message: "Email already in use",
        });
        return;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (
  req: Request<{ id: string }, unknown, unknown>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Prevent deleting the last admin
    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        res.status(400).json({
          success: false,
          message: "Cannot delete the last admin user",
        });
        return;
      }
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile/update
// @access  Private
export const updateProfile = async (
  req: Request & { user?: IUser },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Not authorized",
      });
      return;
    }

    // Check if email is being changed and if it's already in use
    if (req.body.email && req.body.email !== req.user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        res.status(400).json({
          success: false,
          message: "Email already in use",
        });
        return;
      }
    }

    // Prevent role modification through this route
    if ("role" in req.body) {
      delete (req.body as any).role;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};
