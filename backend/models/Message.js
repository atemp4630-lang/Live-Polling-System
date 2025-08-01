const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["student", "teacher"],
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    messageType: {
      type: String,
      enum: ["text", "system", "announcement"],
      default: "text",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
messageSchema.index({ createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ messageType: 1, createdAt: -1 });

// Virtual for message info
messageSchema.virtual("info").get(function () {
  return {
    id: this._id,
    content: this.content,
    senderName: this.senderName,
    senderRole: this.senderRole,
    messageType: this.messageType,
    timestamp: this.createdAt,
    isDeleted: this.isDeleted,
  };
});

// Method to mark message as read
messageSchema.methods.markAsRead = function (userId) {
  const alreadyRead = this.readBy.some(
    (read) => read.userId.toString() === userId.toString()
  );

  if (!alreadyRead) {
    this.readBy.push({
      userId,
      readAt: new Date(),
    });
    return this.save();
  }

  return Promise.resolve(this);
};

// Method to soft delete message
messageSchema.methods.softDelete = function (deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

module.exports = mongoose.model("Message", messageSchema);
