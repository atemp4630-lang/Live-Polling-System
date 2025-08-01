const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    role: {
      type: String,
      enum: ["student", "teacher"],
      required: true,
    },
    socketId: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isKickedOut: {
      type: Boolean,
      default: false,
    },
    kickedOutAt: {
      type: Date,
      default: null,
    },
    kickedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sessionId: {
      type: String,
      default: null,
    },
    currentSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    pollsCreated: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Poll",
      },
    ],
    pollsAnswered: [
      {
        pollId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Poll",
        },
        answeredAt: {
          type: Date,
          default: Date.now,
        },
        selectedOption: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
userSchema.index({ name: 1, role: 1 });
userSchema.index({ socketId: 1 });
userSchema.index({ sessionId: 1 });

// Virtual for user's full info
userSchema.virtual("info").get(function () {
  return {
    id: this._id,
    name: this.name,
    role: this.role,
    isActive: this.isActive,
    isKickedOut: this.isKickedOut,
    lastSeen: this.lastSeen,
  };
});

// Method to check if user can rejoin (after being kicked out)
userSchema.methods.canRejoin = function () {
  if (!this.isKickedOut) return true;

  // Allow rejoin after 30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  return this.kickedOutAt < thirtyMinutesAgo;
};

// Method to reset kick out status
userSchema.methods.resetKickOut = function () {
  this.isKickedOut = false;
  this.kickedOutAt = null;
  this.kickedOutBy = null;
  return this.save();
};

module.exports = mongoose.model("User", userSchema);
