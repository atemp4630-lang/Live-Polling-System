const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

// Join session as student or teacher
router.post("/join", async (req, res) => {
  try {
    const { name, role, sessionCode } = req.body;

    // Validation
    if (!name || !role || !sessionCode) {
      return res
        .status(400)
        .json({ error: "Name, role, and session code are required" });
    }

    if (!["student", "teacher"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Find session
    const Session = require("../models/Session");
    const session = await Session.findOne({
      code: sessionCode.toUpperCase(),
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found or inactive" });
    }

    if (!session.canUserJoin(role)) {
      let errorMessage = "Cannot join session";
      if (session.participants.length >= session.maxParticipants) {
        errorMessage = "Session is full";
      } else if (
        role === "teacher" &&
        !session.allowMultipleTeachers &&
        session.teacherCount > 0
      ) {
        errorMessage =
          "Session already has a teacher and multiple teachers are not allowed";
      }
      return res.status(400).json({ error: errorMessage });
    }

    // Check if name is unique among active users
    const existingUser = await User.findOne({
      name: name.trim(),
      role,
      isActive: true,
      currentSession: session._id,
    });

    if (existingUser) {
      return res.status(400).json({
        error:
          "Name already taken in this session. Please choose a different name.",
      });
    }

    // Create or update user
    let user = await User.findOne({
      name: name.trim(),
      role,
      currentSession: { $in: [null, session._id] },
    });

    if (user) {
      // Check if user can rejoin (if they were kicked out)
      if (user.isKickedOut && !user.canRejoin()) {
        return res.status(403).json({
          error: "You are temporarily banned. Please try again later.",
        });
      }

      // Reset kick out status if allowed to rejoin
      if (user.isKickedOut && user.canRejoin()) {
        await user.resetKickOut();
      }

      user.isActive = true;
      user.lastSeen = new Date();
      user.currentSession = session._id;
      user.sessionId = session.code;
      await user.save();
    } else {
      // Create new user
      user = new User({
        name: name.trim(),
        role,
        isActive: true,
        currentSession: session._id,
        sessionId: session.code,
      });
      await user.save();
    }

    // Add user to session participants
    await session.addParticipant(user._id, role);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        sessionId: user.sessionId,
        sessionName: session.name,
      },
    });
  } catch (error) {
    console.error("Join error:", error);
    res.status(500).json({ error: "Failed to join session" });
  }
});

// Leave session
router.post("/leave", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user) {
      // Remove from session if in one
      if (user.currentSession) {
        const Session = require("../models/Session");
        const session = await Session.findById(user.currentSession);
        if (session) {
          await session.removeParticipant(req.user.userId);
        }
      }

      user.isActive = false;
      user.socketId = null;
      user.currentSession = null;
      user.sessionId = null;
      user.lastSeen = new Date();
      await user.save();
    }

    res
      .status(200)
      .json({ success: true, message: "Left session successfully" });
  } catch (error) {
    console.error("Leave error:", error);
    res.status(500).json({ error: "Failed to leave session" });
  }
});

// Get current user info
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        isKickedOut: user.isKickedOut,
        lastSeen: user.lastSeen,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user info" });
  }
});

module.exports = router;
