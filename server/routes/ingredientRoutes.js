const express = require('express');
const router = express.Router();
const Ingredient = require('../models/Ingredient');
const auth = require('../middleware/auth');

// Get all ingredients for a user
router.get('/', auth, async (req, res) => {
  try {
    const ingredients = await Ingredient.find({ userId: req.user._id });
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new ingredient
router.post('/', auth, async (req, res) => {
  try {
    const ingredient = new Ingredient({
      ...req.body,
      userId: req.user._id
    });
    await ingredient.save();
    res.status(201).json(ingredient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update ingredient
router.put('/:id', auth, async (req, res) => {
  try {
    const ingredient = await Ingredient.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json(ingredient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete ingredient
router.delete('/:id', auth, async (req, res) => {
  try {
    const ingredient = await Ingredient.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.json({ message: 'Ingredient deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ingredient substitutes
router.get('/:id/substitutes', auth, async (req, res) => {
  try {
    const ingredient = await Ingredient.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    // Use AI to generate substitutes
    const substitutes = await generateSubstitutes(ingredient.name);
    res.json(substitutes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate substitutes using AI
const generateSubstitutes = async (ingredientName) => {
  const prompt = `Suggest 3 common substitutes for ${ingredientName} in cooking, including conversion ratios.`;
  
  try {
    const output = await replicate.run(
      "meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3",
      {
        input: {
          prompt,
          max_tokens: 200,
          temperature: 0.7
        }
      }
    );

    // Parse and format the response
    const substitutes = output.map(suggestion => ({
      name: suggestion.name,
      ratio: suggestion.ratio
    }));

    return substitutes;
  } catch (error) {
    console.error('Error generating substitutes:', error);
    return [];
  }
};

module.exports = router; 