const express = require("express");
const Session = require("../models/Session");
const User = require("../models/User");
const Poll = require("../models/Poll");
const auth = require("../middleware/auth");

const router = express.Router();

// Create new session (teachers only)
router.post("/create", async (req, res) => {
  try {

    const {
      name,
      description,
      maxParticipants,
      allowMultipleTeachers,
      settings,
    } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Session name is required" });
    }

    const code = await Session.generateCode();

    const session = new Session({
      name: name.trim(),
      code,
      description: description || "",
      maxParticipants: maxParticipants || 100,
      allowMultipleTeachers: allowMultipleTeachers !== false,
      settings: {
        allowChat: settings?.allowChat !== false,
        allowAnonymousVoting: settings?.allowAnonymousVoting === true,
        showLiveResults: settings?.showLiveResults !== false,
        autoEndPolls: settings?.autoEndPolls !== false,
      },
    });

    await session.save();

    // No need to update user since this is just session creation

    res.status(201).json({
      success: true,
      session: {
        id: session._id,
        name: session.name,
        code: session.code,
        description: session.description,
        maxParticipants: session.maxParticipants,
        allowMultipleTeachers: session.allowMultipleTeachers,
        settings: session.settings,
        participantCount: session.participantCount,
        teacherCount: session.teacherCount,
        studentCount: session.studentCount,
      },
    });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// Join session by code
router.post("/join", auth, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || code.trim().length !== 6) {
      return res
        .status(400)
        .json({ error: "Valid 6-character session code is required" });
    }

    const session = await Session.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found or inactive" });
    }

    if (!session.canUserJoin(req.user.role)) {
      let errorMessage = "Cannot join session";
      if (session.participants.length >= session.maxParticipants) {
        errorMessage = "Session is full";
      } else if (
        req.user.role === "teacher" &&
        !session.allowMultipleTeachers &&
        session.teacherCount > 0
      ) {
        errorMessage =
          "Session already has a teacher and multiple teachers are not allowed";
      }
      return res.status(400).json({ error: errorMessage });
    }

    // Add user to session
    await session.addParticipant(req.user.userId, req.user.role);

    // Update user's current session
    await User.findByIdAndUpdate(req.user.userId, {
      currentSession: session._id,
      sessionId: session.code,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      message: "Joined session successfully",
      session: {
        id: session._id,
        name: session.name,
        code: session.code,
        description: session.description,
        settings: session.settings,
        participantCount: session.participantCount,
        teacherCount: session.teacherCount,
        studentCount: session.studentCount,
      },
    });
  } catch (error) {
    console.error("Join session error:", error);
    res.status(500).json({ error: "Failed to join session" });
  }
});

// Leave current session
router.post("/leave", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !user.currentSession) {
      return res.status(400).json({ error: "Not in any session" });
    }

    const session = await Session.findById(user.currentSession);
    if (session) {
      await session.removeParticipant(req.user.userId);
    }

    // Update user
    await User.findByIdAndUpdate(req.user.userId, {
      currentSession: null,
      sessionId: null,
      isActive: false,
      socketId: null,
    });

    res
      .status(200)
      .json({ success: true, message: "Left session successfully" });
  } catch (error) {
    console.error("Leave session error:", error);
    res.status(500).json({ error: "Failed to leave session" });
  }
});

// Get current session info
router.get("/current", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate(
      "currentSession"
    );

    if (!user || !user.currentSession) {
      return res.status(404).json({ error: "Not in any session" });
    }

    const session = user.currentSession;

    res.status(200).json({
      session: {
        id: session._id,
        name: session.name,
        code: session.code,
        description: session.description,
        settings: session.settings,
        participantCount: session.participantCount,
        teacherCount: session.teacherCount,
        studentCount: session.studentCount,
        createdBy: session.createdBy,
        createdByName: session.createdByName,
      },
    });
  } catch (error) {
    console.error("Get current session error:", error);
    res.status(500).json({ error: "Failed to get session info" });
  }
});

// Get session participants
router.get("/:sessionId/participants", auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId).populate(
      "participants.userId",
      "name role isActive lastSeen"
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Check if user is in this session
    const userInSession = session.participants.some(
      (p) => p.userId._id.toString() === req.user.userId
    );

    if (!userInSession) {
      return res
        .status(403)
        .json({ error: "Not a participant in this session" });
    }

    const participants = session.participants
      .filter((p) => p.userId.isActive)
      .map((p) => ({
        id: p.userId._id,
        name: p.userId.name,
        role: p.userId.role,
        joinedAt: p.joinedAt,
        lastSeen: p.userId.lastSeen,
      }));

    res.status(200).json({ participants });
  } catch (error) {
    console.error("Get session participants error:", error);
    res.status(500).json({ error: "Failed to get participants" });
  }
});

// End session (creator or any teacher)
router.post("/:sessionId/end", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can end sessions" });
    }

    const session = await Session.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Check if user is a teacher in this session
    const userInSession = session.participants.find(
      (p) => p.userId.toString() === req.user.userId && p.role === "teacher"
    );

    if (!userInSession) {
      return res
        .status(403)
        .json({ error: "Not authorized to end this session" });
    }

    // End all active polls in session
    await Poll.updateMany(
      { sessionId: session._id, status: "active" },
      { status: "completed", endTime: new Date(), isLive: false }
    );

    // End session
    session.isActive = false;
    session.endedAt = new Date();
    await session.save();

    // Update all participants
    await User.updateMany(
      { currentSession: session._id },
      {
        currentSession: null,
        sessionId: null,
        isActive: false,
        socketId: null,
      }
    );

    res.status(200).json({
      success: true,
      message: "Session ended successfully",
    });
  } catch (error) {
    console.error("End session error:", error);
    res.status(500).json({ error: "Failed to end session" });
  }
});

// Get user's session history (teachers only)
router.get("/history", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ error: "Only teachers can view session history" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const sessions = await Session.find({ createdBy: req.user.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "name code description participantCount isActive createdAt endedAt"
      );

    const total = await Session.countDocuments({ createdBy: req.user.userId });

    res.status(200).json({
      sessions: sessions.map((session) => ({
        id: session._id,
        name: session.name,
        code: session.code,
        description: session.description,
        participantCount: session.participantCount,
        isActive: session.isActive,
        createdAt: session.createdAt,
        endedAt: session.endedAt,
      })),
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get session history error:", error);
    res.status(500).json({ error: "Failed to get session history" });
  }
});

module.exports = router;
