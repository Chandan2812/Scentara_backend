const express = require("express");
const { WishlistModel } = require("../models/wishlist.model");
const { ProductModel } = require("../models/product.model");
const { auth } = require("../middlewares/auth.middleware");

const wishlistRouter = express.Router();

// Add to wishlist
wishlistRouter.post("/", auth, async (req, res) => {
  try {
    const { productId } = req.body;

    // Check if product exists
    const product = await ProductModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find wishlist or create new
    let wishlist = await WishlistModel.findOne({ userId: req.user.userId });
    if (!wishlist) {
      wishlist = new WishlistModel({ userId: req.user.userId, products: [] });
    }

    // Prevent duplicates
    if (wishlist.products.includes(productId)) {
      return res.status(400).json({ message: "Product already in wishlist" });
    }

    wishlist.products.push(productId);
    await wishlist.save();

    res.status(200).json({ message: "Product added to wishlist", wishlist });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get wishlist
wishlistRouter.get("/", auth, async (req, res) => {
  try {
    const wishlist = await WishlistModel.findOne({
      userId: req.user.userId,
    }).populate("products"); // get full product details

    if (!wishlist || wishlist.products.length === 0) {
      return res.status(404).json({ message: "Wishlist is empty" });
    }

    res.status(200).json({ wishlist });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Remove from wishlist
wishlistRouter.delete("/:productId", auth, async (req, res) => {
  const { productId } = req.params;

  try {
    let wishlist = await WishlistModel.findOne({ userId: req.user.userId });

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    // Remove the product from the wishlist array
    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId
    );

    await wishlist.save();

    res
      .status(200)
      .json({ message: "Product removed from wishlist", wishlist });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Clear entire wishlist
wishlistRouter.delete("/", auth, async (req, res) => {
  try {
    let wishlist = await WishlistModel.findOne({ userId: req.user.userId });

    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    wishlist.products = []; // empty the array
    await wishlist.save();

    res.status(200).json({ message: "Wishlist cleared", wishlist });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = { wishlistRouter };
