const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      length: 6,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    createdByName: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      maxlength: 500,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxParticipants: {
      type: Number,
      default: 100,
      min: 1,
      max: 1000,
    },
    allowMultipleTeachers: {
      type: Boolean,
      default: true,
    },
    settings: {
      allowChat: {
        type: Boolean,
        default: true,
      },
      allowAnonymousVoting: {
        type: Boolean,
        default: false,
      },
      showLiveResults: {
        type: Boolean,
        default: true,
      },
      autoEndPolls: {
        type: Boolean,
        default: true,
      },
    },
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        role: {
          type: String,
          enum: ["student", "teacher"],
        },
      },
    ],
    activePolls: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Poll",
      },
    ],
    endedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
sessionSchema.index({ code: 1 });
sessionSchema.index({ createdBy: 1, createdAt: -1 });
sessionSchema.index({ isActive: 1 });

// Virtual for participant count
sessionSchema.virtual("participantCount").get(function () {
  return this.participants.length;
});

// Virtual for active teacher count
sessionSchema.virtual("teacherCount").get(function () {
  return this.participants.filter((p) => p.role === "teacher").length;
});

// Virtual for active student count
sessionSchema.virtual("studentCount").get(function () {
  return this.participants.filter((p) => p.role === "student").length;
});

// Method to generate unique session code
sessionSchema.statics.generateCode = async function () {
  let code;
  let exists = true;

  while (exists) {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    exists = await this.findOne({ code });
  }

  return code;
};

// Method to add participant
sessionSchema.methods.addParticipant = function (userId, role) {
  // Check if user is already in session
  const existingParticipant = this.participants.find(
    (p) => p.userId.toString() === userId.toString()
  );

  if (existingParticipant) {
    existingParticipant.role = role;
    existingParticipant.joinedAt = new Date();
  } else {
    this.participants.push({
      userId,
      role,
      joinedAt: new Date(),
    });
  }

  return this.save();
};

// Method to remove participant
sessionSchema.methods.removeParticipant = function (userId) {
  this.participants = this.participants.filter(
    (p) => p.userId.toString() !== userId.toString()
  );
  return this.save();
};

// Method to check if user can join
sessionSchema.methods.canUserJoin = function (role) {
  if (!this.isActive) return false;
  if (this.participants.length >= this.maxParticipants) return false;
  if (
    role === "teacher" &&
    !this.allowMultipleTeachers &&
    this.teacherCount > 0
  )
    return false;
  return true;
};

module.exports = mongoose.model("Session", sessionSchema);
