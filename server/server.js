require('isomorphic-fetch');
const fetch = require('node-fetch');
global.fetch = fetch;
global.Headers = fetch.Headers;

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const axios = require('axios');
const GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;

dotenv.config();

// Verify environment variables are loaded
console.log('Environment Variables Check:');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('JWT_SECRET:', process.env.JWT_SECRET);

// Add error handling for missing environment variables
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

if (!process.env.REPLICATE_API_TOKEN) {
  console.error('REPLICATE_API_TOKEN is not defined in environment variables');
  process.exit(1);
}

// Add this after dotenv.config()
console.log('API Keys Check:');
console.log('Spoonacular API Key:', process.env.SPOONACULAR_API_KEY ? 'Present' : 'Missing');
console.log('Replicate API Token:', process.env.REPLICATE_API_TOKEN ? 'Present' : 'Missing');
console.log('Gemini API Key:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');

if (!process.env.SPOONACULAR_API_KEY) {
  console.error('SPOONACULAR_API_KEY is not defined in environment variables');
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY is not configured');
}

// Test Spoonacular API connection
const testSpoonacularAPI = async () => {
  try {
    const response = await axios.get(
      'https://api.spoonacular.com/recipes/complexSearch',
      {
        params: {
          apiKey: process.env.SPOONACULAR_API_KEY,
          number: 1
        }
      }
    );
    console.log('Spoonacular API connection successful');
    return true;
  } catch (error) {
    console.error('Spoonacular API connection failed:', error.response?.data || error.message);
    return false;
  }
};

// Update the testGeminiAPI function
const testGeminiAPI = async () => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('Gemini API key not configured, skipping test');
    return false;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Test message");
    const response = await result.response;
    console.log('Gemini API test response:', response.text());
    console.log('Gemini API connection successful');
    return true;
  } catch (error) {
    if (error.message?.includes('API_KEY_INVALID')) {
      console.error('Invalid Gemini API key');
    } else {
      console.error('Gemini API connection failed:', error);
    }
    return false;
  }
};

const app = express();

// More permissive CORS configuration for development
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body) console.log('Body:', req.body);
  next();
});

app.use(express.json());

// MongoDB Connection with better error handling
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Successfully connected to MongoDB.');
  console.log('Database:', process.env.MONGODB_URI.split('/').pop());
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// MongoDB Connection Events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Routes
const authRoutes = require('./routes/authRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const ingredientRoutes = require('./routes/ingredientRoutes');
const userRecipeRoutes = require('./routes/userRecipeRoutes');

// Add authentication debugging middleware
app.use((req, res, next) => {
  const token = req.headers.authorization;
  console.log('Auth Token:', token);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/user-recipes', userRecipeRoutes);

// Add this before starting the server
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    spoonacular: process.env.SPOONACULAR_API_KEY ? 'configured' : 'not configured'
  });
});

// Update error handling
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });
  
  res.status(err.status || 500).json({ 
    error: err.message || 'Something went wrong!',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5004;

const startServer = async () => {
  try {
    // Test API connections
    const spoonacularStatus = await testSpoonacularAPI();
    if (!spoonacularStatus) {
      console.warn('Warning: Spoonacular API connection failed');
    }

    const geminiStatus = await testGeminiAPI();
    if (!geminiStatus) {
      console.warn('Warning: Gemini API connection failed');
    }

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}`);
      console.log(`MongoDB URI: ${process.env.MONGODB_URI}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error('Server error:', error);
      }
    });

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  });
});

startServer();