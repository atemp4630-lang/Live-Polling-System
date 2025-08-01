const express = require("express");
const Poll = require("../models/Poll");
const User = require("../models/User");
const auth = require("../middleware/auth");
const { validatePoll } = require("../middleware/validation");

const router = express.Router();

// Create new poll (teachers only)
router.post("/create", auth, validatePoll, async (req, res) => {
  try {
    // Check if user is teacher
    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can create polls" });
    }

    // Check if user is in a session
    const user = await User.findById(req.user.userId);
    if (!user || !user.currentSession) {
      return res
        .status(400)
        .json({ error: "Must be in a session to create polls" });
    }

    const { question, options, correctAnswer, duration } = req.body;

    // End any active polls created by this teacher
    await Poll.updateMany(
      { sessionId: user.currentSession, status: "active" },
      { status: "completed", endTime: new Date(), isLive: false }
    );

    // Create new poll
    const poll = new Poll({
      question,
      options: options.map((opt) => ({
        text: opt.trim(),
        votes: 0,
        voters: [],
      })),
      correctAnswer: correctAnswer || null,
      duration: duration || 60,
      createdBy: req.user.userId,
      createdByName: req.user.name,
      sessionId: user.currentSession,
      startTime: new Date(),
    });

    await poll.save();

    // Update user's polls created
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { pollsCreated: poll._id },
    });

    res.status(201).json({
      success: true,
      poll: {
        id: poll._id,
        question: poll.question,
        options: poll.options.map((opt) => ({
          text: opt.text,
          votes: opt.votes,
        })),
        correctAnswer: poll.correctAnswer,
        duration: poll.duration,
        startTime: poll.startTime,
        status: poll.status,
        totalVotes: poll.totalVotes,
      },
    });
  } catch (error) {
    console.error("Create poll error:", error);
    res.status(500).json({ error: "Failed to create poll" });
  }
});

// Vote on poll (students only)
router.post("/:pollId/vote", auth, async (req, res) => {
  try {
    // Check if user is student
    if (req.user.role !== "student") {
      return res.status(403).json({ error: "Only students can vote" });
    }

    const { selectedOption } = req.body;
    const pollId = req.params.pollId;

    if (!selectedOption) {
      return res.status(400).json({ error: "Selected option is required" });
    }

    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    // Check if poll is still active
    if (poll.status !== "active" || poll.isExpired()) {
      return res.status(400).json({ error: "Poll is no longer active" });
    }

    // Check if user already voted
    const hasVoted = poll.options.some((option) =>
      option.voters.some((voter) => voter.userId.toString() === req.user.userId)
    );

    if (hasVoted) {
      return res
        .status(400)
        .json({ error: "You have already voted on this poll" });
    }

    // Add vote
    await poll.addVote(selectedOption, req.user.userId, req.user.name);

    // Update user's answered polls
    await User.findByIdAndUpdate(req.user.userId, {
      $push: {
        pollsAnswered: {
          pollId: poll._id,
          selectedOption,
          answeredAt: new Date(),
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Vote recorded successfully",
      poll: {
        id: poll._id,
        totalVotes: poll.totalVotes,
        results: poll.results,
      },
    });
  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).json({ error: error.message || "Failed to record vote" });
  }
});

// Get current active poll
router.get("/current", auth, async (req, res) => {
  try {
    // Check if user is in a session
    const user = await User.findById(req.user.userId);
    if (!user || !user.currentSession) {
      return res
        .status(400)
        .json({ error: "Must be in a session to view polls" });
    }

    const poll = await Poll.findOne({
      sessionId: user.currentSession,
      status: "active",
      isLive: true,
    }).sort({ startTime: -1 });

    if (!poll) {
      return res.status(404).json({ error: "No active poll found" });
    }

    // Check if poll is expired
    if (poll.isExpired()) {
      await poll.endPoll();
      return res.status(404).json({ error: "Poll has expired" });
    }

    // Check if user has voted (for students)
    let hasVoted = false;
    if (req.user.role === "student") {
      hasVoted = poll.options.some((option) =>
        option.voters.some(
          (voter) => voter.userId.toString() === req.user.userId
        )
      );
    }

    const pollData = {
      id: poll._id,
      question: poll.question,
      options: poll.options.map((opt) => ({
        text: opt.text,
        votes: req.user.role === "teacher" ? opt.votes : 0,
      })),
      duration: poll.duration,
      startTime: poll.startTime,
      status: poll.status,
      totalVotes: req.user.role === "teacher" ? poll.totalVotes : 0,
      hasVoted,
      timeRemaining: Math.max(
        0,
        poll.duration - Math.floor((new Date() - poll.startTime) / 1000)
      ),
    };

    if (hasVoted && req.user.role === "student") {
      pollData.results = poll.results;
      pollData.totalVotes = poll.totalVotes;
    }

    res.status(200).json({ poll: pollData });
  } catch (error) {
    console.error("Get current poll error:", error);
    res.status(500).json({ error: "Failed to get current poll" });
  }
});

// Get poll history (teachers only)
router.get("/history", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res
        .status(403)
        .json({ error: "Only teachers can view poll history" });
    }

    // Check if user is in a session
    const user = await User.findById(req.user.userId);
    if (!user || !user.currentSession) {
      return res
        .status(400)
        .json({ error: "Must be in a session to view poll history" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const polls = await Poll.find({ sessionId: user.currentSession })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "question options totalVotes status startTime endTime correctAnswer"
      );

    const total = await Poll.countDocuments({ sessionId: user.currentSession });

    const pollHistory = polls.map((poll) => ({
      id: poll._id,
      question: poll.question,
      totalVotes: poll.totalVotes,
      status: poll.status,
      startTime: poll.startTime,
      endTime: poll.endTime,
      correctAnswer: poll.correctAnswer,
      results: poll.results,
    }));

    res.status(200).json({
      polls: pollHistory,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get poll history error:", error);
    res.status(500).json({ error: "Failed to get poll history" });
  }
});

// End current poll (teachers only)
router.post("/end", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can end polls" });
    }

    // Check if user is in a session
    const user = await User.findById(req.user.userId);
    if (!user || !user.currentSession) {
      return res
        .status(400)
        .json({ error: "Must be in a session to end polls" });
    }

    const poll = await Poll.findOne({
      sessionId: user.currentSession,
      status: "active",
    });

    if (!poll) {
      return res.status(404).json({ error: "No active poll found" });
    }

    await poll.endPoll();

    res.status(200).json({
      success: true,
      message: "Poll ended successfully",
      poll: {
        id: poll._id,
        status: poll.status,
        endTime: poll.endTime,
        results: poll.results,
      },
    });
  } catch (error) {
    console.error("End poll error:", error);
    res.status(500).json({ error: "Failed to end poll" });
  }
});

module.exports = router;
