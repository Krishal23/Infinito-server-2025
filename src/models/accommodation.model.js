import mongoose from "mongoose";

const accommodationSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    username: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true 
    },
    fullName: { 
        type: String, 
        required: true 
    },
    address: { 
        type: String, 
        required: true 
    },
    phoneNumber: { 
        type: String, 
        required: true 
    },
    adhaar: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) {
                return /^\d{12}$/.test(v);
            },
            message: 'Adhaar number must be 12 digits'
        }
    },
    accommodationDays: { 
        type: Number, 
        required: true,
        min: 1
    },
    optForMeals: { 
        type: Boolean, 
        default: false 
    },
    totalAmount: { 
        type: Number, 
        required: true 
    },
    accommodationFee: { 
        type: Number, 
        required: true 
    },
    mealsFee: { 
        type: Number, 
        default: 0 
    },
    
    // Payment fields
    paymentOrderId: String,
    paymentId: String,
    paymentSignature: String,
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending"
    },
    
    status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled"],
        default: "pending"
    },
    
    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction"
    },
    
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

accommodationSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

export const Accommodation = mongoose.model("Accommodation", accommodationSchema);