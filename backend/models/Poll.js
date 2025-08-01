const mongoose = require("mongoose");

const pollSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    options: [
      {
        text: {
          type: String,
          required: true,
          trim: true,
          maxlength: 100,
        },
        votes: {
          type: Number,
          default: 0,
        },
        voters: [
          {
            userId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            userName: {
              type: String,
              required: true,
            },
            votedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],
    correctAnswer: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByName: {
      type: String,
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    duration: {
      type: Number,
      default: 60, // seconds
      min: 10,
      max: 600,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    totalVotes: {
      type: Number,
      default: 0,
    },
    participantCount: {
      type: Number,
      default: 0,
    },
    isLive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
pollSchema.index({ status: 1, createdAt: -1 });
pollSchema.index({ createdBy: 1, createdAt: -1 });
pollSchema.index({ startTime: 1, endTime: 1 });

// Virtual for poll results
pollSchema.virtual("results").get(function () {
  const total = this.totalVotes;
  return this.options.map((option) => ({
    text: option.text,
    votes: option.votes,
    percentage: total > 0 ? Math.round((option.votes / total) * 100) : 0,
  }));
});

// Method to add vote
pollSchema.methods.addVote = function (optionText, userId, userName) {
  // Check if user already voted
  const hasVoted = this.options.some((option) =>
    option.voters.some((voter) => voter.userId.toString() === userId.toString())
  );

  if (hasVoted) {
    throw new Error("User has already voted on this poll");
  }

  // Find the option and add vote
  const option = this.options.find((opt) => opt.text === optionText);
  if (!option) {
    throw new Error("Invalid option selected");
  }

  option.votes += 1;
  option.voters.push({
    userId,
    userName,
    votedAt: new Date(),
  });

  this.totalVotes += 1;

  return this.save();
};

// Method to end poll
pollSchema.methods.endPoll = function () {
  this.status = "completed";
  this.endTime = new Date();
  this.isLive = false;
  return this.save();
};

// Method to check if poll is expired
pollSchema.methods.isExpired = function () {
  if (this.status !== "active") return true;

  const now = new Date();
  const expiryTime = new Date(this.startTime.getTime() + this.duration * 1000);
  return now > expiryTime;
};

module.exports = mongoose.model("Poll", pollSchema);
