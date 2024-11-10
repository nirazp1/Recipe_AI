const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['produce', 'meat', 'dairy', 'pantry', 'spices', 'other'],
    default: 'other'
  },
  quantity: {
    amount: Number,
    unit: String
  },
  expirationDate: Date,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  },
  substitutes: [{
    name: String,
    ratio: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

module.exports = Ingredient; 