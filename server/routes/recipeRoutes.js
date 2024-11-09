const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = require('node-fetch');

// Set up global fetch and Headers
global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to extract JSON from markdown code blocks
const extractJsonFromMarkdown = (text) => {
  const jsonString = text.replace(/```json\n?|\n?```/g, '').trim();
  return jsonString;
};

// Generate recipe suggestions based on ingredients
router.post('/suggest', async (req, res) => {
  try {
    const { ingredients, dietary_restrictions, servings, diet_type } = req.body;
    
    console.log('Received request with:', { ingredients, dietary_restrictions, servings, diet_type });

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Please provide valid ingredients' });
    }

    console.log('Creating prompt...');
    const prompt = `Generate a recipe using these ingredients: ${ingredients.join(', ')}. 
                    Number of servings: ${servings || 2}.
                    Diet type: ${diet_type || 'regular'}.
                    Additional dietary restrictions: ${dietary_restrictions || 'none'}.
                    Please ensure the recipe strictly follows the ${diet_type || 'regular'} diet guidelines.
                    Format the response as JSON with the following structure:
                    {
                      "title": "Recipe Name",
                      "servings": ${servings || 2},
                      "diet_type": "${diet_type || 'regular'}",
                      "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity", ...],
                      "instructions": ["step 1", "step 2", ...],
                      "nutritional_info": {
                        "per_serving": {
                          "calories": "XXX",
                          "protein": "XXg",
                          "carbs": "XXg",
                          "fat": "XXg"
                        },
                        "total": {
                          "calories": "XXX",
                          "protein": "XXg",
                          "carbs": "XXg",
                          "fat": "XXg"
                        }
                      },
                      "diet_compliance": ["note about how this recipe complies with the diet type"]
                    }`;

    console.log('Initializing Gemini model...');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    console.log('Sending prompt to Gemini:', prompt);
    const result = await model.generateContent(prompt);
    
    if (!result || !result.response) {
      throw new Error('No response from Gemini AI');
    }
    
    const response = await result.response;
    const rawText = response.text();
    console.log('Raw response from Gemini:', rawText);

    try {
      const jsonString = extractJsonFromMarkdown(rawText);
      console.log('Extracted JSON string:', jsonString);
      
      const recipe = JSON.parse(jsonString);
      console.log('Successfully parsed recipe:', recipe);
      res.json(recipe);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw text that failed to parse:', rawText);
      res.status(500).json({ 
        error: 'Failed to parse recipe response', 
        details: parseError.message,
        rawResponse: rawText
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate recipe', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;