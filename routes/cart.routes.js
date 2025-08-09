const express = require("express");
const { CartModel } = require("../models/cart.model");
const { ProductModel } = require("../models/product.model");
const { auth } = require("../middlewares/auth.middleware");

const cartRouter = express.Router();

// Add item to cart
cartRouter.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res
        .status(400)
        .json({ message: "Product ID and quantity are required" });
    }

    // Check if product exists in DB
    const product = await ProductModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find user's cart
    let cart = await CartModel.findOne({ userId });

    if (!cart) {
      // Create new cart if none exists
      cart = new CartModel({
        userId,
        items: [{ productId, quantity }],
      });
    } else {
      // Check if product already in cart
      const existingItem = cart.items.find(
        (item) => item.productId.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += quantity; // Increment quantity
      } else {
        cart.items.push({ productId, quantity });
      }
    }

    await cart.save();

    res.status(201).json({
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET CART ITEMS
cartRouter.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const cart = await CartModel.findOne({ userId }).populate(
      "items.productId", // populate product details
      "name price image brand stock" // only select required fields
    );

    if (!cart) {
      return res.json({ message: "Cart is empty", items: [] });
    }

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// UPDATE CART ITEM QUANTITY
cartRouter.patch("/update", auth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.userId;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({ message: "Invalid product or quantity" });
    }

    const cart = await CartModel.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    res.json({
      message: "Cart updated successfully",
      cart,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Remove product from cart

cartRouter.delete("/:productId", auth, async (req, res) => {
  try {
    const { productId } = req.params;

    // Step 1: Find the user's cart
    const cart = await CartModel.findOne({ userId: req.user.userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Step 2: Check if product exists in the cart
    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // Step 3: Remove the product
    cart.items.splice(itemIndex, 1);

    // Step 4: Save the updated cart
    await cart.save();

    res.json({
      message: "Product removed from cart",
      cart,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = { cartRouter };
