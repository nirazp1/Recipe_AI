const express = require('express');
const router = express.Router();
const UserRecipe = require('../models/UserRecipe');
const auth = require('../middleware/auth');

// Create new recipe
router.post('/', auth, async (req, res) => {
  try {
    const recipeData = {
      ...req.body,
      user: req.user._id // Add the user ID from auth middleware
    };

    const recipe = new UserRecipe(recipeData);
    await recipe.save();

    res.status(201).json(recipe);
  } catch (error) {
    console.error('Save recipe error:', error);
    res.status(500).json({ 
      error: 'Failed to save recipe',
      details: error.message 
    });
  }
});

// Get all recipes for the current user
router.get('/', auth, async (req, res) => {
  try {
    const recipes = await UserRecipe.find({ user: req.user._id })
      .sort({ createdAt: -1 }); // Sort by newest first
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

module.exports = router; 