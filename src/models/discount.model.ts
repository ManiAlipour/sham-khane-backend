import mongoose, { Document, Schema } from "mongoose";

export interface IDiscount extends Document {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  maxDiscount?: number;
  minPurchase: number;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  startDate: Date;
  expiryDate: Date;
  applicableProducts: mongoose.Types.ObjectId[];
  excludedProducts: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  amount: number;
  isValid(): boolean;
  incrementUsage(): Promise<void>;
}

const discountSchema = new Schema({
  code: {
    type: String,
    required: [true, "Please add a discount code"],
    unique: true,
    trim: true,
    uppercase: true,
  },
  description: {
    type: String,
    required: [true, "Please add a description"],
  },
  type: {
    type: String,
    enum: ["percentage", "fixed"],
    required: [true, "Please specify discount type"],
  },
  value: {
    type: Number,
    required: [true, "Please add discount value"],
    min: [0, "Discount value cannot be negative"],
  },
  maxDiscount: {
    type: Number,
    min: [0, "Maximum discount cannot be negative"],
  },
  minPurchase: {
    type: Number,
    default: 0,
    min: [0, "Minimum purchase amount cannot be negative"],
  },
  usageLimit: {
    type: Number,
    default: null,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
    required: [true, "Please add expiry date"],
  },
  applicableProducts: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
    },
  ],
  excludedProducts: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Product",
    },
  ],
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual for calculated amount
discountSchema.virtual("amount").get(function () {
  return this.type === "percentage" ? this.value / 100 : this.value;
});

// Ensure expiry date is in the future
discountSchema.pre("save", function (next) {
  if (this.expiryDate.getTime() < new Date().getTime()) {
    next(new Error("Expiry date must be in the future"));
  }
  this.updatedAt = new Date();
  next();
});

// Check if discount is valid for use
discountSchema.methods.isValid = function () {
  const now = Date.now();
  return (
    this.isActive &&
    now >= this.startDate &&
    now <= this.expiryDate &&
    (!this.usageLimit || this.usageCount < this.usageLimit)
  );
};

// Increment usage count
discountSchema.methods.incrementUsage = async function () {
  this.usageCount += 1;
  if (this.usageLimit && this.usageCount >= this.usageLimit) {
    this.isActive = false;
  }
  await this.save();
};

export default mongoose.model<IDiscount>("Discount", discountSchema);
