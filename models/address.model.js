const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
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
  { timestamps: true }
);

module.exports = mongoose.model("Address", addressSchema);
