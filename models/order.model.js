const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: String, // store name at time of order
        image: String, // store image at time of order
        price: Number, // price snapshot
        quantity: Number,
      },
    ],
    shippingAddress: {
      label: String,
      fullName: String,
      phone: String,
      pincode: String,
      state: String,
      city: String,
      addressLine: String,
      landmark: String,
    },
    paymentMethod: { type: String, enum: ["COD", "ONLINE"], required: true },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    orderStatus: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Returned",
      ],
      default: "Pending",
    },
    totalAmount: { type: Number, required: true },
    transactionId: { type: String }, // from payment gateway if online
    trackingId: { type: String }, // from Shiprocket or courier
  },
  { timestamps: true }
);

const OrderModel = mongoose.model("Order", orderSchema);

module.exports = { OrderModel };
