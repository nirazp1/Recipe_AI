const mongoose = require('mongoose');

const userRecipeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  servings: {
    type: Number,
    required: true
  },
  cuisine_type: String,
  diet_type: String,
  ingredients: [{
    type: String,
    required: true
  }],
  instructions: [{
    type: String,
    required: true
  }],
  nutritional_info: {
    per_serving: {
      calories: String,
      protein: String,
      carbs: String,
      fat: String
    }
  },
  cooking_timers: [{
    step: Number,
    duration: Number,
    description: String
  }],
  total_time: {
    prep: Number,
    cook: Number,
    total: Number
  },
  image: String,
  favorite: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserRecipe', userRecipeSchema); 