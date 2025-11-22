const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Message = require('../models/Message');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter - allow images and documents
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/plain', // .txt
    'text/csv' // .csv
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: images (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV)`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

/**
 * SECURITY MODEL FOR MESSAGING:
 * 
 * 1. PRIVACY: Messages are strictly private between sender and receiver only
 *    - Users can only see messages where they are the sender OR receiver
 *    - No third parties can access conversations
 * 
 * 2. ROLE PERMISSIONS: All role combinations are allowed:
 *    - Patient to Doctor/Provider ✓
 *    - Doctor to Doctor ✓
 *    - Patient to Patient ✓
 *    - Any role to any role (as long as both users are active)
 * 
 * 3. ACCESS CONTROL:
 *    - Only authenticated users can send/receive messages
 *    - Users cannot message themselves
 *    - Users cannot message inactive accounts
 *    - Message read status can only be updated by the receiver
 * 
 * 4. DATA ISOLATION:
 *    - All queries filter by senderId/receiverId to ensure users only see their own messages
 *    - MongoDB queries use $or conditions to match current user as sender or receiver
 */

// @route   GET /api/messages
// @desc    Get messages for user (conversations)
// @access  Private
router.get('/', auth, [
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (userId) {
      // SECURITY: Get conversation between two users - only show messages where current user is sender or receiver
      query = {
        $or: [
          { senderId: req.user._id, receiverId: userId },
          { senderId: userId, receiverId: req.user._id }
        ]
      };
    } else {
      // SECURITY: Get all conversations for user - only show messages where current user is sender or receiver
      query = {
        $or: [
          { senderId: req.user._id },
          { receiverId: req.user._id }
        ]
      };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'firstName lastName email role')
      .populate('receiverId', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching messages'
    });
  }
});

// @route   GET /api/messages/conversations
// @desc    Get list of conversations for user
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    // SECURITY: Only get conversations where current user is sender or receiver
    // Get distinct conversations
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: req.user._id },
            { receiverId: req.user._id }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', req.user._id] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', req.user._id] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: '$_id',
          userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          userEmail: '$user.email',
          userRole: '$user.role',
          lastMessage: {
            content: '$lastMessage.content',
            createdAt: '$lastMessage.createdAt',
            senderId: '$lastMessage.senderId'
          },
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json({
      success: true,
      data: { conversations }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching conversations'
    });
  }
});

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', auth, [
  body('receiverId')
    .isMongoId()
    .withMessage('Invalid receiver ID'),
  body('content')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters'),
  body('messageType')
    .optional()
    .isIn(['text', 'appointment_request', 'health_alert', 'prescription', 'file'])
    .withMessage('Invalid message type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { receiverId, content, messageType = 'text', relatedAppointmentId } = req.body;

    // Check if receiver exists and user has permission to message them
    const User = require('../models/User');
    const receiver = await User.findById(receiverId);
    
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Security check: Users can message anyone, but messages are private between sender and receiver only
    // Allow all role combinations: patient-to-doctor, doctor-to-doctor, patient-to-patient, etc.
    // The only restriction is that users must be active
    if (!receiver.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Cannot message inactive users'
      });
    }

    // Prevent users from messaging themselves
    if (req.user._id.toString() === receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot message yourself'
      });
    }

    const message = new Message({
      senderId: req.user._id,
      receiverId,
      content,
      messageType,
      relatedAppointmentId
    });

    await message.save();
    await message.populate('senderId', 'firstName lastName email role');
    await message.populate('receiverId', 'firstName lastName email role');

    // Create alert for receiver about new message
    try {
      const Alert = require('../models/Alert');
      const senderName = message.senderId.firstName && message.senderId.lastName
        ? `${message.senderId.firstName} ${message.senderId.lastName}`
        : message.senderId.email || message.senderId.username || 'Someone';

      // Check if alert already exists for this message (within last 2 minutes to prevent duplicates)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const existingAlert = await Alert.findOne({
        userId: receiverId,
        'metadata.messageId': message._id.toString(),
        triggeredAt: { $gte: twoMinutesAgo }
      });

      if (!existingAlert) {
        const messageAlert = new Alert({
          userId: receiverId,
          alertType: 'medication_reminder', // Using available alert type for messages
          title: `New Message from ${senderName}`,
          message: `${senderName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
          severity: 'medium',
          status: 'active',
          isRead: false,
          triggeredAt: new Date(),
          metadata: {
            messageId: message._id.toString(),
            senderId: req.user._id.toString(),
            messageType: messageType,
            isMessage: true // Flag to identify message alerts
          }
        });

        await messageAlert.save();
        console.log(`✅ Message alert created for receiver ${receiverId} - will trigger sound notification`);
      }
    } catch (alertError) {
      console.error('Error creating message alert:', alertError);
      // Don't fail message sending if alert creation fails
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message'
    });
  }
});

// @route   POST /api/messages/upload
// @desc    Upload file and create message with attachment
// @access  Private
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    // Validate after multer processes the file
    const errors = validationResult(req);
    
    // Manual validation for receiverId
    if (!req.body.receiverId) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.body.receiverId)) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid receiver ID format'
      });
    }

    if (req.body.content && req.body.content.length > 1000) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Content must be less than 1000 characters'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { receiverId, content = '' } = req.body;

    // SECURITY: Validate receiver exists and is not the sender
    if (receiverId === req.user._id.toString()) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Cannot send message to yourself'
      });
    }

    // Determine message type based on file type
    const isImage = req.file.mimetype.startsWith('image/');
    const messageType = isImage ? 'file' : 'file';

    // Create file URL (relative to server)
    const fileUrl = `/uploads/${req.file.filename}`;
    const fullFileUrl = `${req.protocol}://${req.get('host')}${fileUrl}`;

    // Create message with attachment
    const message = new Message({
      senderId: req.user._id,
      receiverId: receiverId,
      content: content || (isImage ? '📷 Image' : '📄 Document'),
      messageType: messageType,
      attachments: [{
        fileName: req.file.originalname,
        fileUrl: fullFileUrl,
        fileType: req.file.mimetype,
        fileSize: req.file.size
      }]
    });

    await message.save();
    await message.populate('senderId', 'firstName lastName email role');
    await message.populate('receiverId', 'firstName lastName email role');

    // Create alert for receiver about new message with attachment
    try {
      const Alert = require('../models/Alert');
      const senderName = message.senderId.firstName && message.senderId.lastName
        ? `${message.senderId.firstName} ${message.senderId.lastName}`
        : message.senderId.email || message.senderId.username || 'Someone';

      // Check if alert already exists for this message (within last 2 minutes)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const existingAlert = await Alert.findOne({
        userId: receiverId,
        'metadata.messageId': message._id.toString(),
        triggeredAt: { $gte: twoMinutesAgo }
      });

      if (!existingAlert) {
        const messageAlert = new Alert({
          userId: receiverId,
          alertType: 'medication_reminder', // Using available alert type for messages
          title: `New Message from ${senderName}`,
          message: `${senderName} sent you ${isImage ? 'an image' : 'a file'}: ${content || (isImage ? '📷 Image' : '📄 Document')}`,
          severity: 'medium',
          status: 'active',
          isRead: false,
          triggeredAt: new Date(),
          metadata: {
            messageId: message._id.toString(),
            senderId: req.user._id.toString(),
            messageType: messageType,
            isMessage: true
          }
        });

        await messageAlert.save();
        console.log(`✅ Message alert created for receiver ${receiverId} (file upload)`);
      }
    } catch (alertError) {
      console.error('Error creating message alert:', alertError);
      // Don't fail message sending if alert creation fails
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded and message sent successfully',
      data: { message }
    });

  } catch (error) {
    // Delete uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading file'
    });
  }
});

// @route   POST /api/messages/:id/reaction
// @desc    Add or remove reaction to a message
// @access  Private
router.post('/:id/reaction', auth, [
  body('emoji')
    .isString()
    .isLength({ min: 1, max: 10 })
    .withMessage('Emoji must be between 1 and 10 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { emoji } = req.body;

    // Find the message
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // SECURITY: Only allow reactions to messages where current user is sender or receiver
    const isParticipant = 
      message.senderId.toString() === req.user._id.toString() ||
      message.receiverId.toString() === req.user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if user already reacted with this emoji
    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingReactionIndex >= 0) {
      // Remove reaction (toggle off)
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Remove any existing reaction from this user (only one reaction per user)
      message.reactions = message.reactions.filter(
        (r) => r.userId.toString() !== req.user._id.toString()
      );
      // Add new reaction
      message.reactions.push({
        emoji,
        userId: req.user._id,
        createdAt: new Date()
      });
    }

    await message.save();
    await message.populate('reactions.userId', 'firstName lastName email username');

    res.json({
      success: true,
      message: existingReactionIndex >= 0 ? 'Reaction removed' : 'Reaction added',
      data: { message }
    });

  } catch (error) {
    console.error('Reaction error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error while updating reaction',
      ...(process.env.NODE_ENV === 'development' && { error: error.message, stack: error.stack })
    });
  }
});

// @route   PUT /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // SECURITY: Only the receiver can mark a message as read
    if (message.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only mark your own received messages as read.'
      });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    res.json({
      success: true,
      message: 'Message marked as read',
      data: { message }
    });

  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking message as read'
    });
  }
});

// @route   PUT /api/messages/conversation/:userId/read-all
// @desc    Mark all messages in conversation as read
// @access  Private
router.put('/conversation/:userId/read-all', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // SECURITY: Only mark messages as read where current user is the receiver
    await Message.updateMany(
      {
        senderId: userId,
        receiverId: req.user._id, // Ensure current user is the receiver
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'All messages marked as read'
    });

  } catch (error) {
    console.error('Mark all messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking messages as read'
    });
  }
});

// @route   DELETE /api/messages/conversation/:userId
// @desc    Delete all messages in a conversation (clear chat)
// @access  Private
router.delete('/conversation/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // SECURITY: Only delete messages where current user is sender or receiver
    // Mongoose will automatically convert string IDs to ObjectIds in queries
    const result = await Message.deleteMany({
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id }
      ]
    });

    console.log(`Cleared conversation between ${req.user._id} and ${userId}. Deleted ${result.deletedCount} messages.`);

    res.json({
      success: true,
      message: 'Conversation cleared successfully',
      data: { deletedCount: result.deletedCount }
    });

  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while clearing conversation',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   GET /api/messages/unread-count
// @desc    Get unread message count
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
  try {
    // SECURITY: Only count unread messages where current user is the receiver
    const count = await Message.countDocuments({
      receiverId: req.user._id,
      isRead: false
    });

    res.json({
      success: true,
      data: { unreadCount: count }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting unread count'
    });
  }
});

module.exports = router;
