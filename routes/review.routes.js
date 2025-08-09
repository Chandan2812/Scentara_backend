const express = require("express");
const { ReviewModel } = require("../models/review.model");
const { ProductModel } = require("../models/product.model");
const { UserModel } = require("../models/User.model");
const { auth } = require("../middlewares/auth.middleware");

const reviewRouter = express.Router();

reviewRouter.post("/:productId", auth, async (req, res) => {
  const { rating, comment } = req.body;
  const { productId } = req.params;
  const userId = req.user.userId;

  try {
    const product = await ProductModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const user = await UserModel.findById(userId).select("name");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent duplicate reviews by same user
    const alreadyReviewed = await ReviewModel.findOne({ productId, userId });
    if (alreadyReviewed) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this product" });
    }

    const review = new ReviewModel({
      productId,
      userId,
      name: user.name, // Fixed: now getting user's name from DB
      rating,
      comment,
    });

    await review.save();

    res.status(201).json({ message: "Review added successfully", review });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

reviewRouter.get("/:productId", async (req, res) => {
  const { productId } = req.params;

  try {
    const reviews = await ReviewModel.find({ productId }).sort({
      createdAt: -1,
    });

    if (reviews.length === 0) {
      return res
        .status(404)
        .json({ message: "No reviews found for this product" });
    }

    res.status(200).json({ reviews });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

reviewRouter.delete("/:reviewId", auth, async (req, res) => {
  const { reviewId } = req.params;

  try {
    const review = await ReviewModel.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Optional: Only allow the user who created the review OR an admin to delete
    if (
      review.userId.toString() !== req.user.userId &&
      req.user.role !== "admin" &&
      req.user.role !== "superadmin"
    ) {
      return res
        .status(403)
        .json({ message: "You can only delete your own reviews" });
    }

    await ReviewModel.findByIdAndDelete(reviewId);

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

reviewRouter.patch("/:reviewId", auth, async (req, res) => {
  const { reviewId } = req.params;
  const { rating, comment } = req.body;

  try {
    const review = await ReviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Optional: Only allow the review owner or admin to update
    if (
      review.userId.toString() !== req.user.userId &&
      req.user.role !== "admin" &&
      req.user.role !== "superadmin"
    ) {
      return res
        .status(403)
        .json({ message: "You can only update your own reviews" });
    }

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();

    res.status(200).json({ message: "Review updated", review });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = { reviewRouter };
