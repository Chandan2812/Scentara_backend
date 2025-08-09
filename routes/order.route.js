const express = require("express");
const { CartModel } = require("../models/cart.model");
const { OrderModel } = require("../models/order.model");
const { auth } = require("../middlewares/auth.middleware");

const orderRouter = express.Router();

// Place order from cart
orderRouter.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { shippingAddress, paymentMethod } = req.body;

    if (!shippingAddress || !paymentMethod) {
      return res
        .status(400)
        .json({ message: "Shipping address and payment method are required" });
    }

    // 1️⃣ Get the cart for the user
    const cart = await CartModel.findOne({ userId }).populate(
      "items.productId",
      "name price image"
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // 2️⃣ Calculate total price
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.productId.price * item.quantity,
      0
    );

    // 3️⃣ Create order items snapshot
    const orderItems = cart.items.map((item) => ({
      product: item.productId._id,
      name: item.productId.name,
      image: item.productId.image,
      price: item.productId.price,
      quantity: item.quantity,
    }));

    // 4️⃣ Save order
    const newOrder = new OrderModel({
      user: userId,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      totalAmount,
      paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
    });

    await newOrder.save();

    // 5️⃣ Clear the cart
    cart.items = [];
    await cart.save();

    res.status(201).json({
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all orders for logged-in user
orderRouter.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const orders = await OrderModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("items.product", "name price image")
      .populate("shippingAddress"); // if you store address as a reference

    res.json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get single order by ID
orderRouter.get("/:id", auth, async (req, res) => {
  try {
    const orderId = req.params.id;

    let query = { _id: orderId };

    // If not admin, restrict to own orders
    if (req.user.role !== "admin") {
      query.user = req.user.userId;
    }

    const order = await OrderModel.findOne(query)
      .populate("items.product", "name price image")
      .populate("shippingAddress");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update order status (Admin only)
orderRouter.patch("/:id/status", auth, async (req, res) => {
  try {
    // Check if the logged-in user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { status } = req.body;
    const validStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Returned",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const updatedOrder = await OrderModel.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Cancel Order (User or Admin)
orderRouter.delete("/:id", auth, async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // If not admin, ensure this order belongs to the logged-in user
    if (
      req.user.role !== "admin" &&
      order.user.toString() !== req.user.userId
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this order" });
    }

    // Prevent cancellation if order is already shipped or delivered
    if (["Shipped", "Delivered"].includes(order.orderStatus)) {
      return res.status(400).json({
        message:
          "Cannot cancel an order that has already been shipped or delivered",
      });
    }

    // Update status to Cancelled
    order.orderStatus = "Cancelled";
    await order.save();

    res.json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update payment status (can be used in webhook or admin panel)
orderRouter.patch("/:id/payment", auth, async (req, res) => {
  try {
    // Admin or same user can update
    const order = await OrderModel.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      req.user.role !== "admin" &&
      order.user.toString() !== req.user.userId
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this order" });
    }

    const { paymentStatus, transactionId } = req.body;
    const validStatuses = ["Pending", "Paid", "Failed", "Refunded"];

    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    // Update payment status & store transaction reference
    order.paymentStatus = paymentStatus;
    if (transactionId) order.transactionId = transactionId; // Store gateway transaction ID

    await order.save();

    res.json({
      message: "Payment status updated successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = { orderRouter };
