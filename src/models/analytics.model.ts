import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalytics extends Document {
    date: Date;
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    topSellingProducts: Array<{
        productId: mongoose.Types.ObjectId;
        quantity: number;
    }>;
    userRegistrations: number;
    conversionRate: number;
    type?: 'pageview' | 'product_view' | 'purchase';
    url?: string;
    referrer?: string;
    userId?: string;
    productId?: string;
    sessionDuration?: number;
    cart?: {
        created: number;
        abandoned: number;
        converted: number;
    };
}

const analyticsSchema = new Schema<IAnalytics>({
    date: {
        type: Date,
        required: true,
        unique: true
    },
    totalSales: {
        type: Number,
        required: true,
        default: 0
    },
    totalOrders: {
        type: Number,
        required: true,
        default: 0
    },
    averageOrderValue: {
        type: Number,
        required: true,
        default: 0
    },
    topSellingProducts: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    userRegistrations: {
        type: Number,
        required: true,
        default: 0
    },
    conversionRate: {
        type: Number,
        required: true,
        default: 0
    },
    type: {
        type: String,
        enum: ['pageview', 'product_view', 'purchase']
    },
    url: String,
    referrer: String,
    userId: String,
    productId: String,
    sessionDuration: Number,
    cart: {
        created: { type: Number, default: 0 },
        abandoned: { type: Number, default: 0 },
        converted: { type: Number, default: 0 }
    }
}, {
    timestamps: true,
});

// Create compound index for efficient date-based queries
analyticsSchema.index({ date: 1 });

export default mongoose.model<IAnalytics>('Analytics', analyticsSchema); 