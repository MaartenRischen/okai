const express = require('express');
const basicAuth = require('basic-auth');
const bodyParser = require('body-parser');
const path = require('path');
const sequelize = require('./config/database');
const Note = require('./models/Note');
const ChatHistory = require('./models/ChatHistory');
const importRoutes = require('./routes/importRoutes');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Basic Authentication Middleware
const auth = (req, res, next) => {
  const user = basicAuth(req);

  // Check if user credentials are provided and valid
  // Use environment variables for credentials in production/staging
  const adminUser = process.env.ADMIN_USER || 'PLEASE_SET_ENV_VAR';
  const adminPass = process.env.ADMIN_PASSWORD || 'PLEASE_SET_ENV_VAR';

  if (!user || user.name !== adminUser || user.pass !== adminPass) {
    res.set('WWW-Authenticate', 'Basic realm="Restricted Area"');
    return res.status(401).send('Authentication required.');
  }
  next(); // Proceed if authentication is successful
};

// Middleware
app.use(auth); // Apply auth to all routes
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Database initialization
async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync models with database
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

// Routes
// Home page
app.get('/', async (req, res) => {
  try {
    const notes = await Note.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.render('index', { notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.render('index', { notes: [] });
  }
});

// API Routes
app.use('/api/import', importRoutes);

// Get all notes
app.get('/api/notes', async (req, res) => {
  try {
    const notes = await Note.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Create a new note
app.post('/api/notes', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const note = await Note.create({ content });
    res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Get recent ChatGPT messages
app.get('/api/chathistory', async (req, res) => {
  try {
    const messages = await ChatHistory.findAll({
      where: { platform: 'chatgpt' },
      order: [['timestamp', 'DESC']],
      limit: 20
    });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Get all unique ChatGPT conversations (id and title)
app.get('/api/chathistory/conversations', async (req, res) => {
  try {
    // Find all unique conversationIds and their most recent message timestamp
    const conversations = await ChatHistory.findAll({
      where: { platform: 'chatgpt' },
      attributes: [
        'conversationId',
        [sequelize.fn('MAX', sequelize.col('timestamp')), 'lastMessage'],
      ],
      group: ['conversationId'],
      order: [[sequelize.fn('MAX', sequelize.col('timestamp')), 'DESC']],
      raw: true
    });
    // Try to get a title for each conversation (from the first message with non-empty content)
    const withTitles = await Promise.all(conversations.map(async (conv) => {
      const firstMsg = await ChatHistory.findOne({
        where: { conversationId: conv.conversationId, platform: 'chatgpt' },
        order: [['timestamp', 'ASC']],
      });
      return {
        conversationId: conv.conversationId,
        title: firstMsg && firstMsg.content ? firstMsg.content.slice(0, 60) : '(No title)',
        lastMessage: conv.lastMessage
      };
    }));
    res.json(withTitles);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get all messages for a conversation
app.get('/api/chathistory/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await ChatHistory.findAll({
      where: { platform: 'chatgpt', conversationId },
      order: [['timestamp', 'ASC']],
    });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
});

// Start server
app.listen(port, async () => {
  console.log(`OkAi app listening on port ${port}`);
  await initDatabase();
}); 