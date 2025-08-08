const jwt = require("jsonwebtoken");
require("dotenv").config();

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

  if (!token) return res.status(401).json({ msg: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ msg: "Invalid or expired token" });

    req.user = decoded; // { userId, role }
    next();
  });
};

module.exports = { auth };
