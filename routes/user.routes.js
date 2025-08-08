const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { UserModel } = require("../models/User.model");
const { auth } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware"); // ✅ CORRECT

const { upload } = require("../middlewares/upload.middleware");
const nodemailer = require("nodemailer");

require("dotenv").config();

const userRouter = express.Router();

// Register
userRouter.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 5);

    const newUser = new UserModel({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ msg: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong", error: error.message });
  }
});

// Login
userRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      msg: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ msg: "Something went wrong", error: error.message });
  }
});

userRouter.get(
  "/all-users",
  auth,
  authorize("admin", "superadmin"),
  async (req, res) => {
    const users = await UserModel.find();
    res.json(users);
  }
);

userRouter.get("/me", auth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

userRouter.post(
  "/upload-profile",
  auth,
  upload.single("image"),
  async (req, res) => {
    try {
      // Cloudinary returns the uploaded image URL
      const imageUrl = req.file.path;

      // Update user document
      await UserModel.findByIdAndUpdate(req.user.userId, {
        profileImage: imageUrl,
      });

      res.status(200).json({ message: "Profile image updated", imageUrl });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error uploading image", error: error.message });
    }
  }
);

// ✅ Update user profile
userRouter.put("/update-profile", auth, async (req, res) => {
  try {
    const { name, phone, gender } = req.body;

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user.userId,
      { name, phone, gender },
      { new: true }
    ).select("-password"); // don't send password back

    res.status(200).json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating profile", error: error.message });
  }
});

userRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOTP = otp;
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Password Reset OTP",
      text: `Your OTP for resetting password is: ${otp}. It is valid for 10 minutes.`,
    });

    res.json({ message: "OTP sent to your email." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error sending OTP", error: error.message });
  }
});

userRouter.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await UserModel.findOne({
      email,
      resetOTP: otp,
      resetOTPExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired OTP" });

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    await user.save();

    res.json({ message: "Password has been reset successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error resetting password", error: error.message });
  }
});

userRouter.post("/address", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const newAddress = req.body;

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // If isDefault is true, make other addresses not default
    if (newAddress.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    user.addresses.push(newAddress);
    await user.save();

    res.json({
      message: "Address added successfully",
      addresses: user.addresses,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

userRouter.delete("/address/:index", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { index } = req.params;

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (index < 0 || index >= user.addresses.length) {
      return res.status(400).json({ message: "Invalid address index" });
    }

    user.addresses.splice(index, 1);
    await user.save();

    res.json({
      message: "Address deleted successfully",
      addresses: user.addresses,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

userRouter.get("/addresses", auth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

userRouter.put("/address/:index", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { index } = req.params;
    const updatedAddress = req.body;

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (index < 0 || index >= user.addresses.length) {
      return res.status(400).json({ message: "Invalid address index" });
    }

    // If isDefault is true, reset other addresses
    if (updatedAddress.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    // Update the specific address
    user.addresses[index] = {
      ...user.addresses[index]._doc,
      ...updatedAddress,
    };

    await user.save();

    res.json({
      message: "Address updated successfully",
      addresses: user.addresses,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = { userRouter };
