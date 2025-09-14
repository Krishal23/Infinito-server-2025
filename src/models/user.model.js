import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    select: false
  },
  fullname: {
    type: String,
    // required: [true, "Full name is required"]
  },
  role: {
    type: String,
    enum: ["user", "ca", "moderator", "admin"],
    default: "user"
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  collegeName: String,
  address: String,
  rollNo: String,
  isIITPStud: {
    type: Boolean,
    default: false
  },
  googleId: {
    type: String,
    sparse: true
  },
  refreshToken: String,
  score: {
    type: Number,
    default: 0
  },
  caApplication: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ca"
  },
  eventRegistrations: [{
    event: {
      type: String,
      enum: ['athletics', 'badminton', 'basketball', 'chess', 'cricket', 'football',
        'kabaddi', 'lawn_tennis', 'squash', 'table_tennis', 'volleyball', 'weight_lifting'],
      required: true
    },
    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'waitlisted'],
      default: 'pending'
    },
    registrationDate: {
      type: Date,
      default: Date.now
    }
  }],
  accommodations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Accommodation"
  }],

  merchOrders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "MerchOrder"
  }],


  totalEventRegistrations: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export const User = mongoose.model("User", userSchema);