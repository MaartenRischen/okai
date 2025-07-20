const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const ChatHistory = require('../models/ChatHistory');

const router = express.Router();

// Configure Multer for file uploads (store in memory)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Multer error handler middleware
function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File too large. Maximum allowed size is 100MB.' });
    }
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  }
  next(err);
}

// Helper function to safely extract message content
const getMessageContent = (message) => {
  if (message && message.content && message.content.parts) {
    return message.content.parts.join('\n'); // Join parts if present
  } else if (message && message.content && typeof message.content === 'string') {
    return message.content;
  }
  return null; // Or handle as needed
};

// POST route for ChatGPT import
router.post('/chatgpt', upload.single('chatgptFile'), multerErrorHandler, async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    let conversationsData;
    const fileBuffer = req.file.buffer;

    // Check if it's a zip file or plain JSON
    if (req.file.mimetype === 'application/zip') {
      const zip = new AdmZip(fileBuffer);
      const zipEntries = zip.getEntries();
      const jsonEntry = zipEntries.find(entry => entry.entryName === 'conversations.json');

      if (!jsonEntry) {
        return res.status(400).send('conversations.json not found in the zip file.');
      }
      conversationsData = JSON.parse(jsonEntry.getData().toString('utf8'));
    } else if (req.file.mimetype === 'application/json') {
      conversationsData = JSON.parse(fileBuffer.toString('utf8'));
    } else {
      return res.status(400).send('Invalid file type. Please upload conversations.json or a zip containing it.');
    }

    if (!Array.isArray(conversationsData)) {
      return res.status(400).send('Invalid JSON format. Expected an array of conversations.');
    }

    let totalNodes = 0;
    let skippedNoMessageOrAuthor = 0;
    let skippedNoContent = 0;
    let importedCount = 0;
    const importErrors = [];

    // Process each conversation
    for (const conversation of conversationsData) {
      const conversationId = conversation.id;
      const conversationTitle = conversation.title || null;
      if (!conversation.mapping) continue;

      // Find the first user message content as fallback title
      let fallbackTitle = null;
      for (const nodeId in conversation.mapping) {
        const node = conversation.mapping[nodeId];
        if (node.message && node.message.author && node.message.author.role === 'user') {
          const content = getMessageContent(node.message);
          if (content && content.trim()) {
            fallbackTitle = content.slice(0, 60);
            break;
          }
        }
      }
      const finalTitle = conversationTitle || fallbackTitle || '(No title)';

      // Iterate through message nodes
      for (const nodeId in conversation.mapping) {
        totalNodes++;
        const node = conversation.mapping[nodeId];
        if (!node.message || !node.message.author) {
          console.log(`[SKIP] Node ${nodeId} in conversation ${conversationId}: missing message or author.`);
          skippedNoMessageOrAuthor++;
          continue; // Skip nodes without essential message data
        }

        const messageId = node.id;
        const role = node.message.author.role;
        const content = getMessageContent(node.message);
        const timestamp = node.message.create_time ? new Date(node.message.create_time * 1000) : null;

        // Log the message details
        console.log(`[NODE] messageId: ${messageId}, role: ${role}, timestamp: ${timestamp}, content: ${content && content.slice(0, 100)}`);

        if (!content || !content.trim()) {
          console.log(`[SKIP] Message ${messageId} in conversation ${conversationId} due to missing or empty content.`);
          skippedNoContent++;
          continue;
        }

        try {
          // Use findOrCreate to avoid duplicate entries based on messageId
          const [chatMessage, created] = await ChatHistory.findOrCreate({
            where: { messageId: messageId },
            defaults: {
              platform: 'chatgpt',
              conversationId: conversationId,
              title: finalTitle,
              folder: null,
              role: role,
              content: content,
              timestamp: timestamp,
            }
          });

          if (created) {
            importedCount++;
            console.log(`[IMPORTED] Message ${messageId} imported.`);
          } else {
            console.log(`[DUPLICATE] Message ${messageId} already exists in DB.`);
          }
        } catch (error) {
          console.error(`[ERROR] Importing message ${messageId}:`, error);
          importErrors.push(`Message ${messageId}: ${error.message}`);
        }
      }
    }

    console.log(`[SUMMARY] Total nodes processed: ${totalNodes}`);
    console.log(`[SUMMARY] Skipped (no message/author): ${skippedNoMessageOrAuthor}`);
    console.log(`[SUMMARY] Skipped (no content): ${skippedNoContent}`);
    console.log(`[SUMMARY] Imported: ${importedCount}`);

    res.status(200).json({
        message: `Import completed. Imported ${importedCount} new messages.`,
        errors: importErrors
    });

  } catch (error) {
    console.error('Error processing ChatGPT import:', error);
    res.status(500).send(`Server error during import: ${error.message}`);
  }
});

// Placeholder for Gemini import (to be implemented later)
router.post('/gemini', upload.single('geminiFile'), async (req, res) => {
  res.status(501).send('Gemini import not yet implemented.');
});

module.exports = router; 