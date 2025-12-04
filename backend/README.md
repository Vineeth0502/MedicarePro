# HealthMonitor Backend API

This is the backend server for the HealthMonitor application.

## 🚀 Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the `backend/` directory:
```env
MONGODB_URI=mongodb+srv://your-connection-string
PORT=5001
NODE_ENV=development
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

3. Start the server:
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## 📦 Deployment to Vercel

**⚠️ IMPORTANT**: When deploying to Vercel, `.env` files are NOT deployed. You must set environment variables in the Vercel dashboard.

### Required Environment Variables:
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Secret key for JWT tokens (min 32 characters)
- `FRONTEND_URL` - Your frontend Vercel URL
- `NODE_ENV` - Set to `production`

📖 **See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.**

## API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/patients` - Get patients list

- `GET /api/health-metrics` - Get health metrics
- `POST /api/health-metrics` - Create metric
- `PUT /api/health-metrics/:id` - Update metric
- `DELETE /api/health-metrics/:id` - Delete metric

- `GET /api/appointments` - Get appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment

- `GET /api/alerts` - Get alerts
- `POST /api/alerts` - Create alert
- `PUT /api/alerts/:id/acknowledge` - Acknowledge alert
- `PUT /api/alerts/:id/resolve` - Resolve alert

- `GET /api/messages` - Get messages
- `POST /api/messages` - Send message
- `GET /api/messages/conversations` - Get conversations

## Default Configuration

- Port: 5001
- MongoDB: MongoDB Atlas (connection string in server.js)
- CORS: Enabled for localhost:3000 and localhost:3001

