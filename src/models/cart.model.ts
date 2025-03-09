import mongoose, { Schema } from "mongoose";
import { ICart, ICartItem } from "../types/models";

const cartItemSchema = new Schema<ICartItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity cannot be less than 1"],
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
});

const cartSchema = new Schema<ICart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [cartItemSchema],
    totalItems: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    discount: {
      code: {
        type: String,
        default: null,
      },
      amount: {
        type: Number,
        default: 0,
      },
    },
    total: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate totals before saving
cartSchema.pre<ICart>("save", function (next) {
  // Calculate total items
  this.totalItems = this.items.reduce(
    (acc: number, item: ICartItem) => acc + item.quantity,
    0
  );

  // Calculate subtotal
  this.subtotal = this.items.reduce(
    (acc: number, item: ICartItem) => acc + item.totalPrice,
    0
  );

  // Calculate final total with discount
  this.total = Math.max(0, this.subtotal - this.discount.amount);

  next();
});

// Calculate item total price before saving
cartItemSchema.pre<ICartItem>("save", function (next) {
  this.totalPrice = this.price * this.quantity;
  next();
});

export default mongoose.model<ICart>("Cart", cartSchema);
