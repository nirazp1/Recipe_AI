const express = require('express');
const router = express.Router();
const Replicate = require('replicate');
const auth = require('../middleware/auth');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Add caching
const recipeCache = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Rate limiting
let lastGeminiRequest = 0;
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

// Initialize Gemini with rate limiting
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Function to get recipe from Spoonacular
const getRecipeFromSpoonacular = async (ingredients, diet_type = 'regular') => {
  try {
    const searchResponse = await axios.get(
      'https://api.spoonacular.com/recipes/complexSearch',
      {
        params: {
          apiKey: process.env.SPOONACULAR_API_KEY,
          includeIngredients: ingredients.join(','),
          diet: diet_type === 'regular' ? undefined : diet_type,
          addRecipeInformation: true,
          fillIngredients: true,
          number: 1,
          instructionsRequired: true
        }
      }
    );

    if (!searchResponse.data.results?.length) {
      return {
        title: `Simple ${diet_type} Recipe`,
        servings: 2,
        diet_type: diet_type,
        cuisine_type: 'Various',
        ingredients: ingredients.map(ing => `1 portion ${ing}`),
        instructions: [
          'Prepare all ingredients',
          'Combine ingredients in a suitable pan or pot',
          'Cook until done to your preference',
          'Season to taste and serve'
        ],
        cooking_timers: [
          {
            step: 0,
            duration: 5,
            description: "Preparation"
          },
          {
            step: 1,
            duration: 15,
            description: "Cooking"
          }
        ],
        total_time: {
          prep: 5,
          cook: 15,
          total: 20
        },
        nutritional_info: {
          per_serving: {
            calories: '300-400',
            protein: '15-20g',
            carbs: '30-40g',
            fat: '10-15g'
          }
        }
      };
    }

    const recipe = searchResponse.data.results[0];
    return {
      title: recipe.title,
      servings: recipe.servings,
      diet_type: diet_type,
      cuisine_type: recipe.cuisines?.[0] || 'Various',
      ingredients: recipe.extendedIngredients.map(ing => 
        `${ing.amount} ${ing.unit} ${ing.name}`
      ),
      instructions: recipe.analyzedInstructions[0]?.steps.map(step => step.step) || [],
      cooking_timers: recipe.analyzedInstructions[0]?.steps.map((step, index) => ({
        step: index,
        duration: 5, // Default duration
        description: step.step
      })) || [],
      total_time: {
        prep: recipe.preparationMinutes || 10,
        cook: recipe.cookingMinutes || 20,
        total: recipe.readyInMinutes || 30
      },
      nutritional_info: {
        per_serving: {
          calories: recipe.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || 'N/A',
          protein: recipe.nutrition?.nutrients?.find(n => n.name === 'Protein')?.amount + 'g' || 'N/A',
          carbs: recipe.nutrition?.nutrients?.find(n => n.name === 'Carbohydrates')?.amount + 'g' || 'N/A',
          fat: recipe.nutrition?.nutrients?.find(n => n.name === 'Fat')?.amount + 'g' || 'N/A'
        }
      },
      image: recipe.image
    };
  } catch (error) {
    console.error('Spoonacular API error:', error.response?.data || error.message);
    return {
      title: `Simple ${diet_type} Recipe`,
      servings: 2,
      diet_type: diet_type,
      cuisine_type: 'Various',
      ingredients: ingredients.map(ing => `1 portion ${ing}`),
      instructions: [
        'Prepare all ingredients',
        'Combine ingredients in a suitable pan or pot',
        'Cook until done to your preference',
        'Season to taste and serve'
      ],
      cooking_timers: [
        {
          step: 0,
          duration: 5,
          description: "Preparation"
        },
        {
          step: 1,
          duration: 15,
          description: "Cooking"
        }
      ],
      total_time: {
        prep: 5,
        cook: 15,
        total: 20
      },
      nutritional_info: {
        per_serving: {
          calories: '300-400',
          protein: '15-20g',
          carbs: '30-40g',
          fat: '10-15g'
        }
      }
    };
  }
};

// Basic recipe generator as final fallback
const generateBasicRecipe = (ingredients, servings, diet_type) => {
  return {
    title: `Simple ${diet_type} Recipe`,
    servings: servings,
    diet_type: diet_type,
    cuisine_type: 'Various',
    ingredients: ingredients.map(ing => `1 portion ${ing}`),
    instructions: [
      `Prepare all ingredients: ${ingredients.join(', ')}`,
      'Combine ingredients according to your preference',
      'Cook until done'
    ],
    nutritional_info: {
      per_serving: {
        calories: 'N/A',
        protein: 'N/A',
        carbs: 'N/A',
        fat: 'N/A'
      }
    },
    diet_compliance: [
      `Suitable for ${diet_type} diet`,
      `Serves ${servings} people`
    ]
  };
};

// Add this helper function for recipe prompts
const generateRecipePrompt = (ingredients, servings, diet_type, cuisine_type) => {
  return `Create a detailed ${cuisine_type} recipe for ${servings} servings using these ingredients: ${ingredients.join(', ')}.
  The recipe should be ${diet_type} diet friendly.
  Format the response as a JSON object with:
  {
    "title": "Recipe Name",
    "servings": ${servings},
    "ingredients": ["exact quantities"],
    "instructions": ["detailed steps"],
    "nutritional_info": {"calories": "X", "protein": "Xg", "carbs": "Xg", "fat": "Xg"}
  }`;
};

// Add this function at the top with other imports
const generateFoodImage = async (recipe) => {
  try {
    const prompt = `Professional food photography of ${recipe.title}, ${recipe.cuisine_type} cuisine, on a beautiful plate, restaurant quality, high resolution, 4k, detailed`;
    
    const output = await replicate.run(
      "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      {
        input: {
          prompt: prompt,
          negative_prompt: "text, watermark, low quality, blurry, distorted",
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 50
        }
      }
    );

    return output[0]; // Returns the URL of the generated image
  } catch (error) {
    console.error('Image generation error:', error);
    return null;
  }
};

// Update the generateRecipeWithGemini function
const generateRecipeWithGemini = async (ingredients, servings, diet_type, cuisine_type) => {
  try {
    // Check cache first
    const cacheKey = `${ingredients.join(',')}-${servings}-${diet_type}-${cuisine_type}`;
    const cachedRecipe = recipeCache.get(cacheKey);
    if (cachedRecipe) {
      return cachedRecipe;
    }

    // Rate limiting
    const now = Date.now();
    if (now - lastGeminiRequest < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
    lastGeminiRequest = Date.now();

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Create a detailed recipe as a professional chef.
    
    Requirements:
    - Ingredients: ${ingredients.join(', ')}
    - Servings: ${servings}
    - Diet type: ${diet_type}
    - Cuisine: ${cuisine_type}
    
    Format your response EXACTLY like this JSON (no additional text, no markdown):
    {
      "title": "Recipe Name",
      "servings": ${servings},
      "diet_type": "${diet_type}",
      "cuisine_type": "${cuisine_type}",
      "ingredients": [
        "2 cups rice",
        "1 tablespoon olive oil"
      ],
      "instructions": [
        "Heat oil in pan for 2 minutes",
        "Cook rice for 20 minutes"
      ],
      "cooking_timers": [
        {
          "step": 0,
          "duration": 2,
          "description": "Heat oil"
        }
      ],
      "total_time": {
        "prep": 10,
        "cook": 20,
        "total": 30
      },
      "nutritional_info": {
        "per_serving": {
          "calories": 300,
          "protein": "8g",
          "carbs": "45g",
          "fat": "6g"
        }
      }
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log('Raw Gemini response:', text); // Debug log

    try {
      // Clean the response
      const cleanedText = text
        .replace(/```json\s*|\s*```/g, '') // Remove markdown
        .replace(/^[^{]*/, '') // Remove any text before the first {
        .replace(/}[^}]*$/, '}'); // Remove any text after the last }

      console.log('Cleaned response:', cleanedText); // Debug log
      
      const recipe = JSON.parse(cleanedText);

      // Generate image for the recipe
      const imageUrl = await generateFoodImage(recipe);
      if (imageUrl) {
        recipe.image = imageUrl;
      }

      // Validate required fields
      if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
        throw new Error('Missing required recipe fields');
      }

      // Ensure arrays are present
      recipe.ingredients = recipe.ingredients || [];
      recipe.instructions = recipe.instructions || [];
      recipe.cooking_timers = recipe.cooking_timers || [];

      // Add default values if missing
      recipe.total_time = recipe.total_time || {
        prep: 10,
        cook: 20,
        total: 30
      };

      recipe.nutritional_info = recipe.nutritional_info || {
        per_serving: {
          calories: 'N/A',
          protein: 'N/A',
          carbs: 'N/A',
          fat: 'N/A'
        }
      };

      // Cache the result
      recipeCache.set(cacheKey, recipe);
      setTimeout(() => recipeCache.delete(cacheKey), CACHE_DURATION);

      return recipe;
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      console.error('Response text:', text);
      throw new Error('Invalid recipe format from AI');
    }
  } catch (error) {
    if (error.status === 429) {
      // If rate limited, try Spoonacular immediately
      console.log('Gemini rate limited, falling back to Spoonacular');
      return await getRecipeFromSpoonacular(ingredients, diet_type);
    }
    throw error;
  }
};

// Add fallback recipes for common combinations
const FALLBACK_RECIPES = {
  'Asian': {
    title: "Simple Asian Stir Fry",
    servings: 4,
    cuisine_type: "Asian",
    ingredients: [
      "2 cups rice",
      "3 tablespoons soy sauce",
      "1 tablespoon ginger, minced"
    ],
    instructions: [
      "Cook rice according to package instructions",
      "Heat oil in a wok",
      "Add ginger and stir-fry",
      "Add vegetables and cook until tender",
      "Add soy sauce and serve"
    ],
    // ... add other required fields
  },
  'Mexican': {
    title: "Basic Mexican Bowl",
    servings: 4,
    cuisine_type: "Mexican",
    ingredients: [
      "4 tortillas",
      "2 cups black beans",
      "1 avocado"
    ],
    // ... add other fields
  },
  // Add more fallback recipes
};

// Update the suggest route
router.post('/suggest', auth, async (req, res) => {
  try {
    const { ingredients, prompt, diet_type, servings, cuisine_type } = req.body;
    
    // Try Gemini first
    try {
      const recipe = await generateRecipeWithGemini(
        ingredients || ['rice'],
        servings || 2,
        diet_type || 'regular',
        cuisine_type || 'Any'
      );
      return res.json(recipe);
    } catch (error) {
      // If Gemini fails, try Spoonacular
      try {
        const recipe = await getRecipeFromSpoonacular(ingredients, diet_type);
        return res.json(recipe);
      } catch (spoonacularError) {
        // If both fail, use fallback recipe
        const fallbackRecipe = FALLBACK_RECIPES[cuisine_type] || {
          title: `Simple ${cuisine_type || 'Any'} Recipe`,
          servings: servings || 2,
          diet_type: diet_type || 'regular',
          cuisine_type: cuisine_type || 'Any',
          ingredients: ingredients.map(ing => `1 portion ${ing}`),
          instructions: [
            'Prepare ingredients',
            'Cook according to preference',
            'Serve and enjoy'
          ],
          cooking_timers: [
            {
              step: 0,
              duration: 5,
              description: "Preparation"
            }
          ],
          total_time: {
            prep: 5,
            cook: 15,
            total: 20
          },
          nutritional_info: {
            per_serving: {
              calories: 'N/A',
              protein: 'N/A',
              carbs: 'N/A',
              fat: 'N/A'
            }
          }
        };
        
        return res.json(fallbackRecipe);
      }
    }
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recipe', 
      details: error.message
    });
  }
});

// Add this route
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    const response = await axios.get(
      `https://api.spoonacular.com/recipes/complexSearch`,
      {
        params: {
          apiKey: process.env.SPOONACULAR_API_KEY,
          query,
          addRecipeInformation: true,
          fillIngredients: true
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Recipe search error:', error);
    res.status(500).json({ 
      error: 'Failed to search recipes',
      details: error.message 
    });
  }
});

const getUnsplashFoodImage = async (recipe) => {
  try {
    const response = await axios.get(
      `https://api.unsplash.com/search/photos`,
      {
        params: {
          query: `${recipe.title} food`,
          orientation: 'landscape',
          per_page: 1
        },
        headers: {
          Authorization: `Client-ID YOUR_UNSPLASH_ACCESS_KEY`
        }
      }
    );
    
    return response.data.results[0]?.urls?.regular;
  } catch (error) {
    console.error('Unsplash API error:', error);
    return null;
  }
};

module.exports = router;