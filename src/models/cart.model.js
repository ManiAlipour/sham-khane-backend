const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
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

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Calculate totals before saving
cartSchema.pre("save", function (next) {
  // Calculate total items
  this.totalItems = this.items.reduce((acc, item) => acc + item.quantity, 0);

  // Calculate subtotal
  this.subtotal = this.items.reduce((acc, item) => acc + item.totalPrice, 0);

  // Calculate final total with discount
  this.total = this.subtotal - this.discount.amount;

  // Update timestamp
  this.updatedAt = Date.now();

  next();
});

// Calculate item total price before saving
cartItemSchema.pre("save", function (next) {
  this.totalPrice = this.price * this.quantity;
  next();
});

module.exports = mongoose.model("Cart", cartSchema);
