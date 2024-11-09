# Smart Recipe Generator 🍳

A modern web application that leverages AI to generate personalized recipes based on available ingredients and dietary preferences.

## 🌟 Features

- **AI-Powered Recipe Generation**: Utilizes Google's Gemini AI to create custom recipes
- **Personalized Diet Plans**: Supports multiple diet types including:
  - Vegetarian
  - Vegan
  - Keto
  - Paleo
  - Low-Carb
  - Mediterranean
  - Gluten-Free
  - Dairy-Free
- **User Authentication**: Secure account management with JWT
- **Preference Management**: Save and manage dietary preferences
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Dark/Light Mode**: Eye-friendly theme options
- **Nutritional Information**: Detailed nutritional breakdown per recipe

## 🚀 Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- MongoDB
- Google Gemini API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/nirazp1/SMART-RECIPE-APP
cd SMART-RECIPE-APP
```

2. **Set up the server**
```bash
cd server
npm install
cp .env.example .env
```

3. **Configure environment variables**
Edit the `.env` file in the server directory:
```env
PORT=5002
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb://localhost:27017/recipe-app
JWT_SECRET=your_secure_jwt_secret
```

4. **Set up the client**
```bash
cd ../client
npm install
```

### Running the Application

1. **Start the server**
```bash
cd server
npm run dev
```

2. **Start the client**
```bash
cd client
npm start
```

The application will be available at:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5002`

## 🏗️ Architecture

### Frontend
- React.js
- Axios for API requests
- React Icons
- CSS with CSS Variables for theming

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT Authentication
- Google Gemini AI Integration

## 🔒 Security

- JWT-based authentication
- Secure password hashing with bcrypt
- Environment variable protection
- CORS configuration
- Input validation and sanitization

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `PUT /api/auth/preferences` - Update user preferences

### Recipe Endpoints
- `POST /api/recipes/suggest` - Generate recipe suggestions

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for recipe generation
- MongoDB for database services
- React.js community for frontend tools and libraries

## 📞 Support

For support, email nirajpandye283@gmail.com or open an issue in the repository.

## 🔄 Version History

- 1.0.0
  - Initial Release
  - Basic recipe generation
  - User authentication
  - Diet preference management


