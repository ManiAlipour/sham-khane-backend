import { validationResult } from "express-validator";
import type {
  Request,
  Response,
  NextFunction,
} from "express-serve-static-core";
import multer from "multer";
import path from "path";
import Product, { IProduct } from "../models/product.model";
import type { IUser } from "../types/models";
import mongoose from "mongoose";

interface AuthenticatedRequest extends Omit<Request, "user"> {
  user: {
    id: IUser["_id"];
    role: IUser["role"];
  };
}

interface ProductQuery {
  page?: string;
  limit?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

interface ProductBody extends Partial<IProduct> {
  createdBy?: mongoose.Types.ObjectId;
}

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: "./public/uploads/products",
  filename: function (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 }, // 1MB limit
  fileFilter: function (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) {
    checkFileType(file, cb);
  },
}).array("images", 5); // Allow up to 5 images

// Check file type
function checkFileType(
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|webp/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Error: Images only!"));
  }
}

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (
  req: Request<Record<string, never>, unknown, unknown, ProductQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Product.countDocuments();

    const query = Product.find();

    // Filtering
    if (req.query.category) {
      query.where("category").equals(req.query.category);
    }
    if (req.query.minPrice) {
      query.where("price").gte(parseFloat(req.query.minPrice));
    }
    if (req.query.maxPrice) {
      query.where("price").lte(parseFloat(req.query.maxPrice));
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

    const products = await query;

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
      count: products.length,
      pagination,
      data: products,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
export const getProduct = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (
  req: AuthenticatedRequest & { body: ProductBody },
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

    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      data: product,
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

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (
  req: AuthenticatedRequest & {
    params: { id: string };
    body: ProductBody;
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

    let product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: product,
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

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (
  req: AuthenticatedRequest & { params: { id: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Upload product images
// @route   POST /api/products/:id/images
// @access  Private/Admin
export const uploadProductImages = async (
  req: AuthenticatedRequest & {
    params: { id: string };
    files: MulterFile[];
    body: { alt?: string };
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    upload(req, res, async (err: multer.MulterError | Error | null) => {
      if (err) {
        res.status(400).json({
          success: false,
          message: err.message,
        });
        return;
      }

      if (!req.files || !Array.isArray(req.files)) {
        res.status(400).json({
          success: false,
          message: "Please upload at least one image",
        });
        return;
      }

      const images = req.files.map((file) => ({
        url: `/uploads/products/${file.filename}`,
        alt: req.body.alt || product.name,
      }));

      product.images = [...product.images, ...images.map((img) => img.url)];
      await product.save();

      res.status(200).json({
        success: true,
        data: product,
      });
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Search products
// @route   GET /api/products/search/:query
// @access  Public
export const searchProducts = async (
  req: Request<{ query: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const products = await Product.find({
      $text: { $search: req.params.query },
    });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
export const getFeaturedProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const products = await Product.find({ featured: true })
      .limit(6)
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (err) {
    if (err instanceof Error) {
      next(err);
    } else {
      next(new Error("An unknown error occurred"));
    }
  }
};
