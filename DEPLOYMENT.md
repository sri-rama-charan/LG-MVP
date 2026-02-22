# Deployment Guide

This project is configured for deployment on Vercel with both frontend and backend support.

## Local Setup

### Prerequisites
- Node.js 18.x or higher
- npm 9.0.0 or higher
- MongoDB (Cloud or local)
- Redis (Cloud or local)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sri-rama-charan/leverage-groups.git
   cd leverage-groups
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run in development mode**
   ```bash
   npm run dev
   ```

## Deployment on Vercel

### Prerequisites on Vercel
- GitHub repository connected to Vercel
- Environment variables configured in Vercel dashboard

### Required Environment Variables
Configure these in your Vercel project settings:

**Database & Cache:**
- `MONGODB_URI` - MongoDB connection string
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port
- `REDIS_PASSWORD` - Redis password (if required)

**Authentication:**
- `JWT_SECRET` - Long random string (min 32 characters)

**Email Service:**
- `SMTP_HOST` - SMTP server address
- `SMTP_PORT` - SMTP port (usually 587)
- `SMTP_USER` - Email address
- `SMTP_PASSWORD` - Email password/app password
- `SMTP_FROM` - From address for emails

**Communication APIs:**
- `TWILIO_ACCOUNT_SID` - Twilio account ID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number

**Frontend Configuration:**
- `REACT_APP_API_URL` - Backend API URL (e.g., `https://yourdomain.com/api`)
- `REACT_APP_BASE_URL` - Frontend base URL

### Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect the `vercel.json` configuration

3. **Configure Environment Variables**
   - In Vercel project settings, go to Environment Variables
   - Add all variables from `.env.example`
   - Add `NODE_ENV=production`

4. **Deploy**
   - Vercel will automatically build and deploy on push to main branch
   - First build may take 2-3 minutes
   - Check Build Logs for any issues

## Build Process

The `vercel.json` configuration:
- Builds the frontend React app with Vite
- Builds the backend Node.js server
- Routes `/api/*` requests to backend
- Routes all other requests to frontend (SPA)

### Build Command
```bash
npm --prefix frontend run build
```

### Output Directory
Frontend static files: `frontend/dist`

## Monitoring Deployment

1. **Check deployment status**
   - View in Vercel dashboard
   - Check Build & Deployment logs

2. **Common Issues**
   - Missing environment variables: Check Vercel Environment Variables
   - Build failures: Check build logs for specific errors
   - API connection issues: Verify `REACT_APP_API_URL` matches your deployment URL

## Production Checklist

- [ ] All environment variables configured in Vercel
- [ ] MongoDB and Redis are accessible from Vercel
- [ ] HTTPS is enabled (automatic with Vercel)
- [ ] Verify email service is working
- [ ] Test Twilio integration
- [ ] Test WhatsApp integration
- [ ] Review security headers in Helmet middleware
- [ ] Enable CORS for your domain
- [ ] Setup monitoring/logging
- [ ] Configure backups for MongoDB

## Scaling Considerations

- **Database**: Use MongoDB Atlas with proper indexing
- **Cache**: Use Redis Cloud or similar managed service
- **File Storage**: Consider AWS S3 for user uploads
- **Email**: Consider dedicated email service (SendGrid, MailerSend)
- **WhatsApp**: Ensure WhatsApp integration handles rate limits

## Troubleshooting

### Build Error: "Could not find Nx modules"
This is already fixed with the new `vercel.json` configuration. If you still see this:
- Delete `nx.json` if it exists
- Ensure `vercel.json` is in the root directory
- Rebuild the project

### API Connection Errors
- Verify `REACT_APP_API_URL` in Vercel environment variables
- Ensure backend is responding to requests
- Check CORS configuration in `backend/routes/api.js`

### Dependencies Issues
- Run `npm run install-all` locally
- Check `package.json` for deprecated dependencies
- Update packages: `npm update`

## Support
For issues, check:
- Build logs in Vercel dashboard
- Application logs in production
- GitHub repository issues
