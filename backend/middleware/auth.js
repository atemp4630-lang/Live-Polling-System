const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Invalid token. User not found." });
    }

    // Check if user is kicked out
    if (user.isKickedOut && !user.canRejoin()) {
      return res
        .status(403)
        .json({ error: "Access denied. User is kicked out." });
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    req.user = {
      userId: user._id,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token." });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired." });
    }

    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication failed." });
  }
};

module.exports = auth;
