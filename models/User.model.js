const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" }, // Home, Office, etc.
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    pincode: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    addressLine: { type: String, required: true },
    landmark: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false } // prevents creating a new ID for each sub-document
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    profileImage: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
    },
    addresses: [addressSchema], // Array of addresses

    // For password reset
    resetOTP: { type: String },
    resetOTPExpires: { type: Date },
  },
  { timestamps: true }
);

const UserModel = mongoose.model("User", userSchema);

module.exports = { UserModel };
