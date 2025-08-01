const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

// Get all active participants
router.get("/participants", auth, async (req, res) => {
  try {
    // Check if user is in a session
    const user = await User.findById(req.user.userId);
    if (!user || !user.currentSession) {
      return res
        .status(400)
        .json({ error: "Must be in a session to view participants" });
    }

    const participants = await User.find({
      currentSession: user.currentSession,
      isActive: true,
      isKickedOut: false,
    })
      .select("name role lastSeen")
      .sort({ role: 1, name: 1 });

    const participantList = participants.map((user) => ({
      id: user._id,
      name: user.name,
      role: user.role,
      lastSeen: user.lastSeen,
    }));

    res.status(200).json({ participants: participantList });
  } catch (error) {
    console.error("Get participants error:", error);
    res.status(500).json({ error: "Failed to get participants" });
  }
});

// Kick out student (teachers only)
router.post("/kick/:userId", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ error: "Only teachers can kick out students" });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.role !== "student") {
      return res.status(400).json({ error: "Can only kick out students" });
    }

    if (targetUser.isKickedOut) {
      return res.status(400).json({ error: "User is already kicked out" });
    }

    // Update user status
    targetUser.isKickedOut = true;
    targetUser.kickedOutAt = new Date();
    targetUser.kickedOutBy = req.user.userId;
    targetUser.isActive = false;
    targetUser.socketId = null;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `${targetUser.name} has been kicked out`,
      kickedUser: {
        id: targetUser._id,
        name: targetUser.name,
        kickedOutAt: targetUser.kickedOutAt,
      },
    });
  } catch (error) {
    console.error("Kick user error:", error);
    res.status(500).json({ error: "Failed to kick out user" });
  }
});

// Get user statistics (teachers only)
router.get("/stats", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ error: "Only teachers can view statistics" });
    }

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const students = await User.countDocuments({ role: "student" });
    const teachers = await User.countDocuments({ role: "teacher" });
    const kickedOutUsers = await User.countDocuments({ isKickedOut: true });

    res.status(200).json({
      stats: {
        total: totalUsers,
        active: activeUsers,
        students,
        teachers,
        kickedOut: kickedOutUsers,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "Failed to get statistics" });
  }
});

module.exports = router;
