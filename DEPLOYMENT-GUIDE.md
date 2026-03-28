# Visbli Deployment Guide

## Current Architecture

```
visbli-website/
├── backend/          # Node.js Express API (needs 24/7 server)
├── frontend files    # Static HTML/CSS/JS (can be on Vercel)
└── vercel.json       # Vercel config
```

## Deployment Strategy

### Frontend → Vercel (Current)
### Backend → Railway (Recommended)

---

## Step 1: Deploy Backend to Railway

### Why Railway?
- ✅ Free tier with 500 hours/month
- ✅ Perfect for Node.js backends
- ✅ Easy database connections
- ✅ No cold starts
- ✅ Automatic HTTPS
- ✅ Environment variables support

### Steps:

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `visbli-website` repository
   - Railway will detect it's a Node.js project

3. **Configure Root Directory**
   - In project settings, set:
   - **Root Directory**: `visbli-website/backend`
   - **Start Command**: `npm start`

4. **Add Environment Variables**
   Copy all variables from `backend/.env`:
   ```
   DATABASE_URL=postgresql://...
   DIRECT_URL=postgresql://...
   JWT_SECRET=...
   JWT_REFRESH_SECRET=...
   JWT_EXPIRES_IN=1d
   JWT_REFRESH_EXPIRES_IN=30d
   RAZORPAY_KEY_ID=rzp_live_...
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=whsec_...
   PORT=5000
   NODE_ENV=production
   FRONTEND_URL=https://your-vercel-domain.vercel.app
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=admin@visbli.in
   EMAIL_PASSWORD=...
   EMAIL_FROM=admin@visbli.in
   APP_NAME=Visbli
   APP_URL=https://your-railway-domain.railway.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Get your backend URL: `https://your-app.up.railway.app`

6. **Update Razorpay Webhook**
   - Go to Razorpay Dashboard → Webhooks
   - Update webhook URL to: `https://your-app.up.railway.app/api/payments/webhook`

---

## Step 2: Update Frontend for Production

### Update API Base URL

Edit `visbli-website/api-client.js`:

```javascript
// Change this line:
const API_BASE_URL = 'http://localhost:5000/api';

// To:
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-app.up.railway.app/api'  // Your Railway backend URL
  : 'http://localhost:5000/api';
```

Or better, use environment variable:

```javascript
const API_BASE_URL = window.VISBLI_API_URL || 'http://localhost:5000/api';
```

Then in your HTML files, add before loading api-client.js:
```html
<script>
  window.VISBLI_API_URL = 'https://your-app.up.railway.app/api';
</script>
<script src="api-client.js"></script>
```

---

## Step 3: Deploy Frontend to Vercel

### Option A: Keep Current Deployment
1. Update `api-client.js` with Railway backend URL
2. Push to GitHub
3. Vercel auto-deploys

### Option B: Configure Vercel Properly

Update `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm start",
  "installCommand": "npm install",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/$1"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

---

## Alternative: Deploy Backend to Render

### Why Render?
- ✅ Free tier available
- ✅ Similar to Railway
- ✅ Good for Node.js

### Steps:
1. Go to [render.com](https://render.com)
2. Create "New Web Service"
3. Connect GitHub repo
4. Set:
   - **Root Directory**: `visbli-website/backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables
6. Deploy

---

## Alternative: Deploy Backend to Heroku

### Steps:
1. Install Heroku CLI
2. Create `Procfile` in backend folder:
   ```
   web: node src/server.js
   ```
3. Deploy:
   ```bash
   cd visbli-website/backend
   heroku create visbli-backend
   heroku config:set DATABASE_URL=...
   # Add all env vars
   git push heroku main
   ```

---

## Environment Variables Checklist

### Backend (Railway/Render/Heroku)
- [ ] DATABASE_URL
- [ ] DIRECT_URL
- [ ] JWT_SECRET
- [ ] JWT_REFRESH_SECRET
- [ ] JWT_EXPIRES_IN
- [ ] JWT_REFRESH_EXPIRES_IN
- [ ] RAZORPAY_KEY_ID
- [ ] RAZORPAY_KEY_SECRET
- [ ] RAZORPAY_WEBHOOK_SECRET
- [ ] PORT
- [ ] NODE_ENV=production
- [ ] FRONTEND_URL (your Vercel URL)
- [ ] EMAIL_HOST
- [ ] EMAIL_PORT
- [ ] EMAIL_USER
- [ ] EMAIL_PASSWORD
- [ ] EMAIL_FROM
- [ ] APP_NAME
- [ ] APP_URL (your backend URL)

### Frontend (Vercel)
- [ ] VISBLI_API_URL (optional, can hardcode in api-client.js)

---

## Post-Deployment Checklist

### Backend
- [ ] Backend is accessible at Railway URL
- [ ] Health check works: `https://your-app.railway.app/health`
- [ ] Database connection successful
- [ ] CORS allows your Vercel domain
- [ ] Razorpay webhook updated

### Frontend
- [ ] Frontend loads on Vercel
- [ ] API calls go to Railway backend
- [ ] Login/Signup works
- [ ] Payment flow works
- [ ] Razorpay checkout opens
- [ ] Email notifications sent

### Testing
- [ ] Create new account
- [ ] Login works
- [ ] Select a plan
- [ ] Complete payment
- [ ] Receive confirmation email
- [ ] Check database for records

---

## Troubleshooting

### Backend not starting
- Check Railway logs
- Verify all environment variables are set
- Check DATABASE_URL is correct

### CORS errors
- Update CORS in `backend/src/server.js`
- Add your Vercel domain to allowed origins

### Payment not working
- Check Razorpay keys are LIVE keys
- Verify webhook URL is updated
- Check backend logs for errors

### Email not sending
- Verify email credentials
- Check EMAIL_HOST and EMAIL_PORT
- Test with Gmail first

---

## Cost Estimate

### Free Tier (Good for testing)
- Railway: 500 hours/month (free)
- Vercel: Unlimited (free)
- Supabase: 500MB database (free)
- Total: $0/month

### Paid Tier (Production)
- Railway: $5/month (Hobby plan)
- Vercel: $20/month (Pro plan, optional)
- Supabase: $25/month (Pro plan)
- SendGrid: $15/month (for emails)
- Total: ~$45-65/month

---

## Recommended Setup

1. **Development**:
   - Backend: localhost:5000
   - Frontend: localhost:3000

2. **Staging** (optional):
   - Backend: Railway (free tier)
   - Frontend: Vercel preview deployment

3. **Production**:
   - Backend: Railway (paid) or Render
   - Frontend: Vercel
   - Database: Supabase (paid)
   - Email: SendGrid or AWS SES

---

## Quick Deploy Commands

### Backend to Railway
```bash
# Railway will auto-deploy from GitHub
# Just push to main branch
git add .
git commit -m "Deploy backend"
git push origin main
```

### Frontend to Vercel
```bash
# Vercel will auto-deploy from GitHub
# Just push to main branch
git add .
git commit -m "Update frontend"
git push origin main
```

---

## Need Help?

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
