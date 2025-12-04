#!/usr/bin/env node

// Script to generate Vercel CLI commands for adding environment variables
const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse .env file
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
  }
});

console.log('\n🚀 VERCEL ENVIRONMENT VARIABLES SETUP\n');
console.log('Run these commands in order:\n');
console.log('1. First, login to Vercel:');
console.log('   vercel login\n');
console.log('2. Link your project (if not already linked):');
console.log('   cd backend');
console.log('   vercel link\n');
console.log('3. Add environment variables:\n');

// MONGODB_URI
if (envVars.MONGODB_URI) {
  console.log('   # Add MONGODB_URI');
  console.log(`   echo "${envVars.MONGODB_URI}" | vercel env add MONGODB_URI production`);
  console.log(`   echo "${envVars.MONGODB_URI}" | vercel env add MONGODB_URI preview`);
  console.log(`   echo "${envVars.MONGODB_URI}" | vercel env add MONGODB_URI development`);
  console.log('');
}

// JWT_SECRET
if (envVars.JWT_SECRET) {
  console.log('   # Add JWT_SECRET');
  console.log(`   echo "${envVars.JWT_SECRET}" | vercel env add JWT_SECRET production`);
  console.log(`   echo "${envVars.JWT_SECRET}" | vercel env add JWT_SECRET preview`);
  console.log(`   echo "${envVars.JWT_SECRET}" | vercel env add JWT_SECRET development`);
  console.log('');
}

// NODE_ENV
console.log('   # Add NODE_ENV');
console.log('   echo "production" | vercel env add NODE_ENV production');
console.log('');

// FRONTEND_URL
console.log('   # Add FRONTEND_URL (update with your actual frontend URL)');
console.log('   echo "https://your-frontend-app.vercel.app" | vercel env add FRONTEND_URL production');
console.log('   echo "https://your-frontend-app.vercel.app" | vercel env add FRONTEND_URL preview');
console.log('   echo "https://your-frontend-app.vercel.app" | vercel env add FRONTEND_URL development');
console.log('');

console.log('4. After adding all variables, redeploy in Vercel dashboard or run:');
console.log('   vercel --prod\n');

