import { validationResult } from "express-validator";
import type {
  Request,
  Response,
  NextFunction,
} from "express-serve-static-core";
import Cart, { ICartItem } from "../models/cart.model";
import Product from "../models/product.model";
import Discount from "../models/discount.model";
import type { IUser } from "../types/models";

interface CartItemBody {
  productId: string;
  quantity: number;
}

interface DiscountBody {
  code: string;
}

interface AuthenticatedRequest extends Omit<Request, "user"> {
  user: {
    id: IUser["_id"];
  };
}

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate({
      path: "items.product",
      select: "name price images stock",
    });

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [],
      });
    }

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
export const addToCart = async (
  req: AuthenticatedRequest & { body: CartItemBody },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { productId, quantity } = req.body;

    // Check if product exists and has enough stock
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    if (product.stock < quantity) {
      res.status(400).json({
        success: false,
        message: "Not enough stock available",
      });
      return;
    }

    // Get user's cart or create new one
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [],
      });
    }

    // Check if product already in cart
    const itemIndex = cart.items.findIndex(
      (item: ICartItem) => item.product.toString() === productId
    );

    if (itemIndex > -1) {
      // Product exists in cart, update quantity
      cart.items[itemIndex].quantity += quantity;
      cart.items[itemIndex].totalPrice =
        cart.items[itemIndex].quantity * product.price;
    } else {
      // Product not in cart, add new item
      cart.items.push({
        product: productId,
        quantity,
        price: product.price,
        totalPrice: quantity * product.price,
      } as ICartItem);
    }

    await cart.save();

    // Populate product details
    await cart.populate({
      path: "items.product",
      select: "name price images stock",
    });

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:itemId
// @access  Private
export const updateCartItem = async (
  req: AuthenticatedRequest & {
    body: CartItemBody;
    params: { itemId: string };
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

    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      res.status(404).json({
        success: false,
        message: "Cart not found",
      });
      return;
    }

    const itemIndex = cart.items.findIndex(
      (item: ICartItem) => item._id?.toString() === req.params.itemId
    );

    if (itemIndex === -1) {
      res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
      return;
    }

    // Check product stock
    const product = await Product.findById(cart.items[itemIndex].product);
    if (!product || product.stock < quantity) {
      res.status(400).json({
        success: false,
        message: "Not enough stock available",
      });
      return;
    }

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].totalPrice = quantity * cart.items[itemIndex].price;

    await cart.save();

    // Populate product details
    await cart.populate({
      path: "items.product",
      select: "name price images stock",
    });

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private
export const removeFromCart = async (
  req: AuthenticatedRequest & { params: { itemId: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      res.status(404).json({
        success: false,
        message: "Cart not found",
      });
      return;
    }

    cart.items = cart.items.filter(
      (item: ICartItem) => item._id?.toString() !== req.params.itemId
    );

    await cart.save();

    // Populate product details
    await cart.populate({
      path: "items.product",
      select: "name price images stock",
    });

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      res.status(404).json({
        success: false,
        message: "Cart not found",
      });
      return;
    }

    cart.items = [];
    cart.discount = {
      code: null,
      amount: 0,
    };

    await cart.save();

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Apply discount to cart
// @route   POST /api/cart/discount
// @access  Private
export const applyDiscount = async (
  req: AuthenticatedRequest & { body: DiscountBody },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { code } = req.body;

    // Find valid discount
    const discount = await Discount.findOne({
      code,
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

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      res.status(404).json({
        success: false,
        message: "Cart not found",
      });
      return;
    }

    cart.discount = {
      code: discount.code,
      amount: discount.amount,
    };

    await cart.save();

    res.status(200).json({
      success: true,
      data: cart,
    });
  } catch (err) {
    next(err);
  }
};
