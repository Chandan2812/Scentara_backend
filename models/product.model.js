const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brand: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true }, // e.g., Men's, Women's, Unisex
    fragranceType: { type: String }, // e.g., Eau de Parfum, Eau de Toilette
    volume: { type: Number, required: true }, // in ml (e.g., 50, 100)
    price: { type: Number, required: true },
    originalPrice: { type: Number }, // for discounts
    stock: { type: Number, required: true },
    ingredients: [{ type: String }], // optional
    topNotes: [{ type: String }],
    middleNotes: [{ type: String }],
    baseNotes: [{ type: String }],
    image: { type: String, required: true }, // Cloudinary URL
    rating: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ProductModel = mongoose.model("Product", productSchema);

module.exports = { ProductModel };
