import mongoose, { Document, Schema, Model } from "mongoose";
import { IProduct, IUser } from "../types/models";

export interface IReview extends Document {
  user: IUser["_id"];
  product: IProduct["_id"];
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IReviewModel extends Model<IReview> {
  getAverageRating(productId: mongoose.Types.ObjectId): Promise<void>;
}

const reviewSchema = new Schema<IReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    rating: {
      type: Number,
      required: [true, "Please add a rating"],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, "Please add a comment"],
      minlength: [10, "Comment must be at least 10 characters"],
      maxlength: [1000, "Comment cannot be more than 1000 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent user from submitting more than one review per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Static method to calculate average rating
reviewSchema.statics.getAverageRating = async function (
  productId: mongoose.Types.ObjectId
): Promise<void> {
  const obj = await this.aggregate([
    {
      $match: { product: productId },
    },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  try {
    if (obj[0]) {
      await mongoose.model("Product").findByIdAndUpdate(productId, {
        rating: Math.round(obj[0].averageRating * 10) / 10,
        numReviews: obj[0].numReviews,
      });
    } else {
      await mongoose.model("Product").findByIdAndUpdate(productId, {
        rating: 0,
        numReviews: 0,
      });
    }
  } catch (err) {
    console.error("Error updating product rating:", err);
  }
};

// Call getAverageRating after save
reviewSchema.post<IReview>("save", async function (this: IReview) {
  await (this.constructor as IReviewModel).getAverageRating(this.product);
});

// Call getAverageRating before delete
reviewSchema.pre<IReview>("deleteOne", async function (this: IReview) {
  await (this.constructor as IReviewModel).getAverageRating(this.product);
});

export default mongoose.model<IReview, IReviewModel>("Review", reviewSchema);
