import { Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  phoneNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  isEmailVerified: boolean;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  verificationToken?: string;
  verificationTokenExpire?: Date;
  createdAt: Date;
  getSignedJwtToken(): string;
  matchPassword(enteredPassword: string): Promise<boolean>;
  getResetPasswordToken(): string;
}

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  images: string[];
  stock: number;
  rating: number;
  numReviews: number;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICartItem extends Document {
  product: IProduct["_id"];
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface ICart extends Document {
  user: IUser["_id"];
  items: ICartItem[];
  totalItems: number;
  subtotal: number;
  discount: {
    code: string | null;
    amount: number;
  };
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrder extends Document {
  user: IUser["_id"];
  items: Array<{
    product: IProduct["_id"];
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  totalAmount: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "pending" | "completed" | "failed";
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnalytics extends Document {
  type: "pageview" | "product_view" | "purchase";
  url?: string;
  referrer?: string;
  userId?: IUser["_id"];
  productId?: IProduct["_id"];
  sessionDuration?: number;
  timestamp: Date;
}
