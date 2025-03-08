const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        unique: true
    },
    sales: {
        total: {
            type: Number,
            default: 0
        },
        count: {
            type: Number,
            default: 0
        }
    },
    products: {
        viewed: [{
            product: {
                type: mongoose.Schema.ObjectId,
                ref: 'Product'
            },
            count: {
                type: Number,
                default: 0
            }
        }],
        purchased: [{
            product: {
                type: mongoose.Schema.ObjectId,
                ref: 'Product'
            },
            count: {
                type: Number,
                default: 0
            },
            revenue: {
                type: Number,
                default: 0
            }
        }]
    },
    users: {
        newRegistrations: {
            type: Number,
            default: 0
        },
        activeUsers: {
            type: Number,
            default: 0
        }
    },
    traffic: {
        pageViews: {
            type: Number,
            default: 0
        },
        uniqueVisitors: {
            type: Number,
            default: 0
        },
        bounceRate: {
            type: Number,
            default: 0
        }
    },
    cart: {
        created: {
            type: Number,
            default: 0
        },
        abandoned: {
            type: Number,
            default: 0
        },
        converted: {
            type: Number,
            default: 0
        }
    },
    discounts: {
        used: [{
            code: {
                type: String
            },
            count: {
                type: Number,
                default: 0
            },
            amount: {
                type: Number,
                default: 0
            }
        }]
    }
});

// Create compound index for efficient date-based queries
analyticsSchema.index({ date: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema); 