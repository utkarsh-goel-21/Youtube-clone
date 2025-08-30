# YouTube Clone

A fully-featured YouTube clone application built from the ground up using the MERN stack with Next.js. This project demonstrates advanced full-stack development skills by implementing core YouTube functionalities including video streaming, user authentication, real-time features, and a comprehensive content management system.

## 🔗 Live Demo
- **Frontend**: [Coming Soon - Deploying to Vercel]
- **Backend API**: [https://youtube-clone-backend-utkarsh.onrender.com](https://youtube-clone-backend-utkarsh.onrender.com)
- **API Health Check**: [https://youtube-clone-backend-utkarsh.onrender.com/api/health](https://youtube-clone-backend-utkarsh.onrender.com/api/health)

## 🚀 Features

### Core Features
- **Video Upload & Streaming**: Upload videos with automatic thumbnail generation
- **User Authentication**: JWT-based authentication with registration and login
- **Video Player**: Custom HTML5 video player with full controls
- **Comments System**: Nested comments with likes/dislikes and replies
- **Search Functionality**: Full-text search for videos and channels
- **User Subscriptions**: Subscribe to channels and get subscription feed
- **Responsive Design**: Mobile-first responsive UI
- **Real-time Updates**: Socket.io integration for live comments

### Additional Features
- **Video Categories**: Organize videos by categories
- **User Profiles**: Customizable user channels with avatars and banners
- **Watch History**: Track and display user's watch history
- **Playlists**: Create and manage video playlists
- **Video Analytics**: Basic view counts and engagement metrics
- **Admin Dashboard**: Content moderation and user management
- **File Upload**: Robust file handling with validation and security

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Lucide React icons
- **HTTP Client**: Axios
- **Video Player**: Custom HTML5 video player
- **Real-time**: Socket.io client

### Backend
- **Framework**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer with local storage
- **Video Processing**: FFmpeg for thumbnails and metadata
- **Real-time**: Socket.io
- **Validation**: express-validator
- **Security**: bcryptjs for password hashing, CORS

## 📁 Project Structure

```
youtube-clone/
├── backend/                 # Express.js backend
│   ├── middleware/         # Authentication, upload, validation
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API routes
│   ├── uploads/           # Uploaded video files
│   ├── thumbnails/        # Generated thumbnails
│   └── server.js          # Express server setup
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app directory
│   │   ├── components/    # React components
│   │   ├── store/         # Redux store and slices
│   │   ├── services/      # API service functions
│   │   ├── types/         # TypeScript type definitions
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # CSS styles
│   └── public/            # Static assets
├── shared/                # Shared type definitions
└── README.md             # Project documentation
```

## 🚀 Getting Started

### Prerequisites

Before running the application, make sure you have the following installed:

- **Node.js** (v18 or higher)
- **MongoDB** (v5 or higher)
- **FFmpeg** (for video processing)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/utkarsh-goel-21/Youtube-clone.git
   cd Youtube-clone
   ```

2. **Install dependencies for all packages**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   
   **Backend (.env)**
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/youtube-clone
   JWT_SECRET=your-super-secret-jwt-key
   FRONTEND_URL=http://localhost:3000
   ```

   **Frontend (.env.local)**
   ```bash
   cd ../frontend
   cp .env.example .env.local
   ```
   
   Edit the `.env.local` file:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
   ```

4. **Start MongoDB**
   
   Make sure MongoDB is running on your system:
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using MongoDB directly
   mongod
   ```

5. **Start the application**
   
   **Option 1: Start both frontend and backend together**
   ```bash
   npm run dev
   ```
   
   **Option 2: Start them separately**
   ```bash
   # Terminal 1 - Backend
   npm run dev:backend
   
   # Terminal 2 - Frontend
   npm run dev:frontend
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📱 Usage

### User Registration and Authentication
1. Visit http://localhost:3000
2. Click "Sign In" and then "Sign Up"
3. Create an account with username, email, and password
4. Log in with your credentials

### Uploading Videos
1. Log in to your account
2. Click the upload button (+ icon) in the header
3. Select a video file and add title, description, and tags
4. Choose a category and privacy setting
5. Click "Upload" to publish your video

### Watching Videos
1. Browse videos on the home page or search for specific content
2. Click on any video thumbnail to start watching
3. Use the custom video player controls
4. Like, dislike, and comment on videos
5. Subscribe to channels you enjoy

### Managing Your Channel
1. Click on your profile avatar
2. Select "Your Channel" to view your channel page
3. Upload videos, customize your channel description
4. View your video analytics and subscriber count

## 🔧 Development

### Available Scripts

**Root Level**
- `npm run dev` - Start both frontend and backend
- `npm run dev:frontend` - Start only frontend
- `npm run dev:backend` - Start only backend
- `npm run install:all` - Install all dependencies

**Backend**
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

**Frontend**
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features

1. **Backend API Endpoint**
   - Add route in `backend/routes/`
   - Define controller logic
   - Add validation middleware
   - Update models if needed

2. **Frontend Component**
   - Create component in `frontend/src/components/`
   - Add Redux slice if state management needed
   - Create service function in `frontend/src/services/`
   - Add TypeScript types in `frontend/src/types/`

### Database Schema

**User Schema**
- Personal info (username, email, password)
- Channel info (name, description, avatar, banner)
- Subscriptions and subscribers
- Watch history and playlists
- Settings and preferences

**Video Schema**
- Metadata (title, description, category, tags)
- File information (URL, thumbnail, duration)
- Engagement (views, likes, dislikes)
- Privacy and status settings
- Analytics data

**Comment Schema**
- Content and author
- Parent/child relationships for replies
- Like/dislike counts
- Moderation flags (pinned, hearted, deleted)

## 🔒 Security Features

- **Authentication**: JWT-based secure authentication
- **Password Security**: bcrypt hashing with salt
- **Input Validation**: Comprehensive validation on all inputs
- **File Upload Security**: File type and size restrictions
- **CORS Configuration**: Proper cross-origin resource sharing
- **XSS Protection**: Input sanitization and output encoding
- **Rate Limiting**: API rate limiting (can be added)

## 🚀 Deployment

### Production Build

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Set production environment variables**
   ```bash
   NODE_ENV=production
   MONGODB_URI=your-production-db-url
   JWT_SECRET=your-production-jwt-secret
   ```

3. **Start production servers**
   ```bash
   # Backend
   cd backend && npm start
   
   # Frontend
   cd frontend && npm start
   ```

### Deployment Options

- **Vercel** (Frontend): Easy deployment for Next.js applications
- **Railway/Render** (Backend): Simple Node.js deployment
- **MongoDB Atlas**: Cloud MongoDB database
- **AWS/Google Cloud**: Full-stack deployment with file storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Update password

### Video Endpoints
- `GET /api/videos` - Get all videos (with pagination)
- `GET /api/videos/trending` - Get trending videos
- `GET /api/videos/:id` - Get video by ID
- `POST /api/videos/upload` - Upload new video
- `PUT /api/videos/:id` - Update video
- `DELETE /api/videos/:id` - Delete video
- `POST /api/videos/:id/like` - Like video
- `POST /api/videos/:id/dislike` - Dislike video

### Comment Endpoints
- `GET /api/comments/video/:videoId` - Get video comments
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment
- `POST /api/comments/:id/like` - Like comment

### Search Endpoints
- `GET /api/search?q=query` - Search videos and channels
- `GET /api/search/suggestions?q=query` - Get search suggestions

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check the MONGODB_URI in your .env file
   - Verify database permissions

2. **File Upload Issues**
   - Check file size limits
   - Ensure upload directory exists and is writable
   - Verify FFmpeg is installed for video processing

3. **CORS Errors**
   - Check FRONTEND_URL in backend .env
   - Ensure frontend is running on the correct port

4. **Build Errors**
   - Clear node_modules and reinstall dependencies
   - Check for TypeScript errors
   - Ensure all environment variables are set

### Performance Optimization

- Enable video compression and multiple quality options
- Implement CDN for video delivery
- Add database indexing for better search performance
- Use Redis for caching frequently accessed data
- Implement lazy loading for video thumbnails

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** team for the amazing React framework
- **MongoDB** for the flexible database solution
- **Tailwind CSS** for the utility-first CSS framework
- **FFmpeg** for video processing capabilities
- **Lucide React** for the beautiful icon library

## 📞 Contact

For any questions, suggestions, or collaboration opportunities:
- Open an issue on GitHub
- Connect with me on LinkedIn
- Check out my other projects on GitHub

---

**Developed with passion and attention to detail by Utkarsh**

*This project showcases modern web development practices and a deep understanding of full-stack JavaScript development.*