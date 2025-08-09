const express = require("express");
const { ProductModel } = require("../models/product.model");
const { auth } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

const productRouter = express.Router();

// @route   POST /products
// @desc    Add a new perfume product
// @access  Admin/Superadmin
productRouter.post(
  "/",
  auth,
  authorize("admin", "superadmin"),
  async (req, res) => {
    try {
      const product = new ProductModel(req.body);
      await product.save();

      res
        .status(201)
        .json({ message: "Product created successfully", product });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to create product", error: err.message });
    }
  }
);

productRouter.get("/", async (req, res) => {
  try {
    const {
      search,
      category,
      brand,
      fragranceType,
      isFeatured,
      minPrice,
      maxPrice,
      sortBy,
      order,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { fragranceType: { $regex: search, $options: "i" } },
      ];
    }

    // Filters
    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (fragranceType) query.fragranceType = fragranceType;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Sorting
    const sortOptions = {};
    if (sortBy) {
      const sortField = sortBy;
      const sortOrder = order === "desc" ? -1 : 1;
      sortOptions[sortField] = sortOrder;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const total = await ProductModel.countDocuments(query);
    const products = await ProductModel.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

productRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const product = await ProductModel.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

productRouter.patch(
  "/:id",
  auth,
  authorize("admin", "superadmin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedProduct = await ProductModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

productRouter.delete(
  "/:id",
  auth,
  authorize("admin", "superadmin"),
  async (req, res) => {
    try {
      const id = req.params.id.trim();

      const deletedProduct = await ProductModel.findByIdAndDelete(id);

      if (!deletedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({
        message: "Product deleted successfully",
        product: deletedProduct,
      });
    } catch (err) {
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

module.exports = { productRouter };
