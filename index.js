const express = require("express");
const cors = require("cors");
const { connection } = require("./config/db");
require("dotenv").config();
const { userRouter } = require("./routes/user.routes");
const { productRouter } = require("./routes/product.routes");
const { reviewRouter } = require("./routes/review.routes");
const { cartRouter } = require("./routes/cart.routes");
const { wishlistRouter } = require("./routes/wishlist.route");
const { orderRouter } = require("./routes/order.route");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

app.use("/user", userRouter);
app.use("/products", productRouter);

app.use("/review", reviewRouter);
app.use("/cart", cartRouter);

app.use("/wishlist", wishlistRouter);
app.use("/order", orderRouter);

// Test route
app.get("/", (req, res) => {
  res.send("Scentara E-commerce API is running...");
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, async () => {
  try {
    await connection;
    console.log("Connected to DB");
  } catch (error) {}
  console.log("Server is listening");
});
