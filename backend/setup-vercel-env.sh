#!/bin/bash

# Script to set environment variables in Vercel
# Make sure you're logged in: vercel login

echo "🚀 Setting up Vercel environment variables for backend..."

# Read values from .env file
source .env

# Check if we're in the backend directory
if [ ! -f "src/server.js" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo ""
echo "📋 Adding environment variables to Vercel..."
echo ""

# Add MONGODB_URI
echo "Adding MONGODB_URI..."
vercel env add MONGODB_URI production <<< "$MONGODB_URI"
vercel env add MONGODB_URI preview <<< "$MONGODB_URI"
vercel env add MONGODB_URI development <<< "$MONGODB_URI"

# Add JWT_SECRET
echo "Adding JWT_SECRET..."
vercel env add JWT_SECRET production <<< "$JWT_SECRET"
vercel env add JWT_SECRET preview <<< "$JWT_SECRET"
vercel env add JWT_SECRET development <<< "$JWT_SECRET"

# Add NODE_ENV
echo "Adding NODE_ENV..."
vercel env add NODE_ENV production <<< "production"

# Add FRONTEND_URL (you'll need to update this)
echo "⚠️  FRONTEND_URL needs to be set manually with your frontend URL"
echo "   Run: vercel env add FRONTEND_URL production"
echo "   Then enter: https://your-frontend-app.vercel.app"

echo ""
echo "✅ Environment variables added!"
echo "🔄 Now redeploy your project in Vercel dashboard"

