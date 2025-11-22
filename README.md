# 🏥 MediCare Pro

<div align="center">

![MediCare Pro Logo](public/icon.svg)

**Professional Healthcare Management Platform**

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.8-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [API Documentation](#-api-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

MediCare Pro is a comprehensive healthcare management platform designed for patients, healthcare providers, and administrators. It provides real-time health monitoring, intelligent alerts, secure messaging, appointment scheduling, and advanced analytics in a single, integrated solution.

### Key Highlights

- ⚡ **Real-time Health Monitoring** - Live updates every minute
- 🔒 **HIPAA Compliant** - Enterprise-grade security
- 📱 **Fully Responsive** - Works on all devices
- 🎨 **Modern UI/UX** - Clean, professional design
- 🔔 **Intelligent Alerts** - Critical health condition notifications
- 💬 **Secure Messaging** - Encrypted patient-provider communication
- 📊 **Advanced Analytics** - Comprehensive health metrics dashboard

---

## ✨ Features

### For Patients
- 📈 Real-time health metrics tracking (15+ metrics)
- 📅 Smart appointment booking and management
- 💬 Secure messaging with healthcare providers
- 🔔 Intelligent alerts for critical health conditions
- 📱 Mobile-responsive dashboard
- 📊 Personal health analytics and trends

### For Healthcare Providers
- 👥 Patient management and monitoring
- 📊 Hospital-wide analytics dashboard
- 🔔 Real-time alerts and notifications
- 📅 Appointment scheduling and management
- 💬 Secure patient communication
- 📈 Health metrics tracking across all patients

### Core Features
- 🔐 **Authentication & Authorization** - JWT-based secure login
- 📊 **Health Metrics** - 15+ tracked metrics with normal ranges
- 🔔 **Alert System** - Automatic alert generation for abnormal values
- 💬 **Messaging** - WhatsApp-style chat with file attachments
- 📅 **Appointments** - Full CRUD with calendar view
- 📈 **Analytics** - Real-time charts and visualizations
- 👤 **User Management** - Role-based access control
- 🎨 **Modern UI** - 3D components and animations

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 16.0
- **UI Library**: React 19.2
- **Styling**: Tailwind CSS 4.1
- **Components**: Radix UI
- **Charts**: Recharts
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **Notifications**: Sonner (Toast)
- **Date Handling**: date-fns

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **ORM**: Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Validation**: express-validator

### DevOps
- **Package Manager**: npm
- **Version Control**: Git
- **Deployment**: Vercel (Frontend) / Railway/Heroku (Backend)

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v9.0 or higher) - Comes with Node.js
- **MongoDB Atlas Account** - [Sign up](https://www.mongodb.com/cloud/atlas) (Free tier available)
- **Git** - [Download](https://git-scm.com/)

### Verify Installation

```bash
node --version  # Should be v18.0 or higher
npm --version   # Should be v9.0 or higher
git --version   # Any recent version
```

---

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/medicare-pro.git
cd medicare-pro
```

### Step 2: Install Frontend Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js and React
- Tailwind CSS
- Radix UI components
- Recharts for data visualization
- And all other frontend dependencies

### Step 3: Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

This will install:
- Express.js
- Mongoose
- JWT authentication
- Multer for file uploads
- And all other backend dependencies

### Step 4: Environment Configuration

Create a `.env` file in the **root directory**:

```bash
# Frontend Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

Create a `.env` file in the **backend directory**:

```bash
# Backend Environment Variables
PORT=5001
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=your_mongodb_atlas_connection_string

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters

# CORS Origin (for production, update with your domain)
CORS_ORIGIN=http://localhost:3000
```

#### Getting MongoDB Atlas Connection String

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account or sign in
3. Create a new cluster (free tier M0)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Replace `<password>` with your database password
7. Replace `<dbname>` with `healthmonitor` (or your preferred database name)

**⚠️ IMPORTANT: Never commit your `.env` file to Git!**

The `.env` file is already in `.gitignore` to protect your sensitive credentials. Always keep your MongoDB URI and JWT secret secure.

Example format (DO NOT use this exact string):
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/healthmonitor?retryWrites=true&w=majority
```

#### Generating JWT Secret

```bash
# Generate a random secret key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ Security Note**: 
- Never share your `.env` file
- Never commit `.env` to version control
- Use different secrets for development and production
- Keep your MongoDB credentials private

---

## ⚙️ Configuration

### Database Setup

The application will automatically:
- Connect to MongoDB on startup
- Create necessary collections
- Set up indexes
- Initialize device simulator for health metrics

### Initial Data

The application includes scripts to populate initial data:

```bash
# Create 25 patient accounts
cd backend
node scripts/createPatients.js

# Create 14 doctor accounts
node scripts/createDoctors.js
```

**Default Password**: `Thor@0502` (for all generated accounts)

---

## 🏃 Running the Application

### Development Mode

#### Terminal 1: Start Backend Server

```bash
cd backend
npm start
```

The backend server will start on `http://localhost:5001`

You should see:
```
✅ MongoDB Atlas connected successfully
✅ Server running on port 5001
✅ Device simulator started
```

#### Terminal 2: Start Frontend Server

```bash
# From root directory
npm run dev
```

The frontend will start on `http://localhost:3000`

Open your browser and navigate to:
- **Home Page**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard (after login)

### Production Mode

#### Build Frontend

```bash
npm run build
npm start
```

#### Run Backend

```bash
cd backend
NODE_ENV=production npm start
```

---

## 📁 Project Structure

```
medicare-pro/
├── app/                          # Next.js App Router
│   ├── dashboard/               # Dashboard pages
│   │   ├── alerts/             # Alerts & notifications
│   │   ├── appointments/      # Appointment management
│   │   ├── doctors/            # Doctors listing
│   │   ├── messages/           # Messaging system
│   │   ├── metrics/            # Health metrics dashboard
│   │   ├── patients/           # Patient management
│   │   ├── settings/           # User settings
│   │   └── support/             # Support page
│   ├── login/                  # Login page
│   ├── onboarding/             # User onboarding
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
│
├── backend/                     # Express.js Backend
│   ├── src/
│   │   ├── models/             # Mongoose models
│   │   │   ├── User.js
│   │   │   ├── HealthMetric.js
│   │   │   ├── Alert.js
│   │   │   ├── Appointment.js
│   │   │   └── Message.js
│   │   ├── routes/             # API routes
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── healthMetrics.js
│   │   │   ├── alerts.js
│   │   │   ├── appointments.js
│   │   │   └── messages.js
│   │   ├── middleware/        # Express middleware
│   │   │   └── auth.js
│   │   ├── services/           # Business logic
│   │   │   └── deviceSimulator.js
│   │   └── server.js           # Server entry point
│   ├── scripts/                # Utility scripts
│   │   ├── createPatients.js
│   │   └── createDoctors.js
│   ├── uploads/               # User uploads (gitignored)
│   └── package.json
│
├── components/                  # React components
│   ├── dashboard/             # Dashboard components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── notification-center.tsx
│   └── ui/                     # Reusable UI components
│
├── lib/                        # Utilities
│   ├── api.ts                  # API client
│   └── utils.ts                # Helper functions
│
├── public/                     # Static assets
│   ├── icon.svg
│   └── ...
│
├── .env                        # Environment variables (create this)
├── .gitignore                  # Git ignore rules
├── package.json                # Frontend dependencies
└── README.md                   # This file
```

---

## 📡 API Documentation

### Base URL

```
Development: http://localhost:5001/api
Production: https://your-backend-domain.com/api
```

### Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Endpoints

#### Authentication

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

#### Users

```http
GET    /api/users/profile
PUT    /api/users/profile
GET    /api/users/patients
GET    /api/users/doctors
GET    /api/users/:id
```

#### Health Metrics

```http
GET    /api/health-metrics
GET    /api/health-metrics/patient/:patientId
GET    /api/health-metrics/hospital/overview
POST   /api/health-metrics
```

#### Alerts

```http
GET    /api/alerts
GET    /api/alerts/summary
GET    /api/alerts/patient/:patientId
POST   /api/alerts
PUT    /api/alerts/:id/read
```

#### Appointments

```http
GET    /api/appointments
POST   /api/appointments
PUT    /api/appointments/:id
DELETE /api/appointments/:id
```

#### Messages

```http
GET    /api/messages
GET    /api/messages/conversations
POST   /api/messages
POST   /api/messages/upload
PUT    /api/messages/:id/read
```

---

---

## 🔧 Troubleshooting

### Backend Issues

#### Port Already in Use

```bash
# Kill process on port 5001
lsof -ti:5001 | xargs kill -9
```

#### MongoDB Connection Failed

- Verify your `MONGODB_URI` in `.env`
- Check network connectivity
- Ensure IP address is whitelisted in MongoDB Atlas
- Verify database user credentials

#### JWT Errors

- Ensure `JWT_SECRET` is set in backend `.env`
- Secret should be at least 32 characters
- Restart backend server after changing JWT_SECRET

### Frontend Issues

#### Build Errors

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

#### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Port 3000 Already in Use

```bash
# Use different port
PORT=3001 npm run dev
```

### Common Issues

#### "Cannot connect to backend"

- Ensure backend is running on port 5001
- Check `NEXT_PUBLIC_API_URL` in frontend `.env`
- Verify CORS settings in backend

#### "No metrics showing"

- Wait 1-2 minutes for device simulator to generate data
- Check backend console for errors
- Verify MongoDB connection

---

## 🧪 Testing

### Manual Testing

1. **Create Test Account**
   - Go to `/onboarding`
   - Select "Patient" or "Provider"
   - Complete registration

2. **Test Features**
   - Login with test account
   - Navigate through dashboard
   - Create appointments
   - Send messages
   - View health metrics

### Database Scripts

```bash
# Generate metrics for all patients
cd backend
node scripts/generateMetricsNow.js

# Verify health status distribution
node scripts/verifyHealthStatus.js
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for frontend
- Follow ESLint rules
- Write meaningful commit messages
- Add comments for complex logic

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Radix UI for accessible components
- Recharts for beautiful data visualizations
- MongoDB for reliable database hosting

---

## 📞 Support

For support, email vineethketham@gmail.com or open an issue in the repository.

---

<div align="center">

**Made with ❤️ for better healthcare management**

[⬆ Back to Top](#-medicare-pro)

</div>

