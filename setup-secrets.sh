#!/bin/bash
# setup-secrets.sh
# This script helps generate secure secrets for deployment

echo "🔐 Leverage Groups - Secrets Generator"
echo "======================================"
echo ""

# Generate JWT Secret
echo "Generating JWT_SECRET..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "✓ JWT_SECRET: $JWT_SECRET"
echo ""

# Instructions
echo "📋 Environment Variables to Configure:"
echo "======================================"
echo ""
echo "1. Copy the following values to your .env file (local):"
echo "   JWT_SECRET=$JWT_SECRET"
echo ""
echo "2. For Vercel, add these to your project settings:"
echo "   - Go to: https://vercel.com/your-project/settings/environment-variables"
echo "   - Add each variable with the appropriate values"
echo ""
echo "3. Essential variables for Vercel:"
echo "   - MONGODB_URI (MongoDB connection string)"
echo "   - REDIS_HOST (Redis server host)"
echo "   - REDIS_PORT (Redis server port)"
echo "   - REDIS_PASSWORD (if required)"
echo "   - JWT_SECRET=$JWT_SECRET"
echo "   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD"
echo "   - VITE_API_URL (production backend URL)"
echo ""
echo "💡 Tips:"
echo "   - Use MongoDB Atlas for managed database"
echo "   - Use Redis Cloud for managed cache"
echo "   - Store secrets only in Vercel environment settings"
echo "   - Never commit .env file to Git"
echo ""
