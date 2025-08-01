const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

// Get chat messages
router.get('/messages', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('content senderName senderRole messageType createdAt');

    // Reverse to show oldest first
    const chatMessages = messages.reverse().map(message => ({
      id: message._id,
      content: message.content,
      senderName: message.senderName,
      senderRole: message.senderRole,
      messageType: message.messageType,
      timestamp: message.createdAt
    }));

    res.status(200).json({ messages: chatMessages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send message
router.post('/send', auth, async (req, res) => {
  try {
    // Check if user is in a session
    const User = require('../models/User');
    const user = await User.findById(req.user.userId);
    if (!user || !user.currentSession) {
      return res.status(400).json({ error: 'Must be in a session to send messages' });
    }

    const { content, messageType = 'text' } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Message is too long' });
    }

    const message = new Message({
      content: content.trim(),
      sender: req.user.userId,
      senderName: req.user.name,
      senderRole: req.user.role,
      sessionId: user.currentSession,
      messageType
    });

    await message.save();

    res.status(201).json({
      success: true,
      message: {
        id: message._id,
        content: message.content,
        senderName: message.senderName,
        senderRole: message.senderRole,
        messageType: message.messageType,
        timestamp: message.createdAt
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Delete message (teachers only)
router.delete('/:messageId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can delete messages' });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await message.softDelete(req.user.userId);

    res.status(200).json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;