const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  dietPreferences: {
    dietType: {
      type: String,
      enum: ['regular', 'keto', 'vegetarian', 'vegan', 'paleo', 'low-carb', 'mediterranean', 'gluten-free', 'dairy-free'],
      default: 'regular'
    },
    additionalRestrictions: [String],
    servingSize: {
      type: Number,
      default: 2
    },
    allergies: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User; 