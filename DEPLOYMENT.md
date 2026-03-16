# Vercel Deployment Guide

## Prerequisites

1. GitHub account
2. Vercel account (sign up at vercel.com)
3. Anthropic API key (get from console.anthropic.com)

---

## Step-by-Step Deployment

### 1. Push Code to GitHub

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Social Scheduler MVP"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/yourusername/social-scheduler.git
git branch -M main
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Choose your `social-scheduler` repository
5. Vercel will auto-detect Next.js settings ✅

### 3. Configure Environment Variables

Before deploying, add your environment variables:

1. In the **"Environment Variables"** section, add:
   
   **Key**: `ANTHROPIC_API_KEY`  
   **Value**: `sk-ant-api03-...` (your actual key)
   
2. Select all environments: **Production**, **Preview**, **Development**

3. Click **"Add"**

### 4. Deploy

Click **"Deploy"** button and wait ~2 minutes.

Your app will be live at: `https://your-project-name.vercel.app`

---

## Post-Deployment

### Test the App

1. Visit your Vercel URL
2. Select a model from the dropdown
3. Click "Create Post"
4. Try AI caption generation
5. Check VA view at `/va`

### Custom Domain (Optional)

1. In Vercel project settings → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. SSL certificate auto-configured ✅

---

## Updating the App

Whenever you push to GitHub, Vercel auto-deploys:

```bash
# Make changes to your code
git add .
git commit -m "Add new feature"
git push

# Vercel automatically detects and deploys
```

---

## Environment Variables Management

### Add New Variable

1. Go to your Vercel project
2. **Settings** → **Environment Variables**
3. Add variable
4. Redeploy for changes to take effect

### Update Existing Variable

1. Delete old variable
2. Add new one with same key
3. Redeploy

---

## Vercel-Specific Features

### Edge Functions
Your API routes (`/api/generate-captions`) run on Vercel's Edge Network for low latency.

### Automatic HTTPS
All deployments get free SSL certificates.

### Preview Deployments
Every PR gets its own preview URL for testing.

### Analytics (Optional)
Enable Vercel Analytics in project settings for visitor insights.

---

## Build Settings

Vercel auto-detects these (no changes needed):

- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

---

## Cost Estimate

### Vercel
- **Hobby Plan**: FREE (perfect for this prototype)
- **Pro Plan**: $20/month (if you need more features later)

### Anthropic API
- Claude Sonnet 4: ~$3 per million input tokens, ~$15 per million output tokens
- Estimated cost with 100 models × 10 posts/day × 3 caption generations:
  - ~3,000 API calls/day
  - ~$10-30/month depending on caption library size

### Total Monthly Cost
**~$0-50/month** for the prototype (FREE if using Vercel Hobby + minimal API usage)

---

## Troubleshooting

### Build Fails

**Error**: `Type error: Cannot find module '@/lib/store'`
- Check all imports use correct paths
- Verify `tsconfig.json` has path aliases configured

**Error**: `Module not found: Can't resolve 'zustand'`
- Run `npm install` locally first
- Push `package.json` and `package-lock.json` to GitHub

### Environment Variables Not Working

1. Ensure variable name is EXACTLY: `ANTHROPIC_API_KEY`
2. Check it's added to all environments
3. Redeploy after adding variables
4. View logs: Project → Deployments → Click deployment → View Function Logs

### AI Caption Generation Fails

1. Verify API key is valid at console.anthropic.com
2. Check you have API credits
3. View Vercel function logs for detailed errors
4. The app falls back to default captions if API fails

### Deployment Takes Too Long

- First deployment: 2-5 minutes (normal)
- Subsequent: 30-90 seconds (normal)
- If stuck >10 mins, cancel and retry

---

## Next Steps After Deployment

1. **Test thoroughly** with real data
2. **Add database** (Vercel Postgres or Supabase)
3. **Connect S3** for file storage
4. **Add authentication** (NextAuth.js)
5. **Build caption library** interface
6. **Implement real EXIF** spoofing

---

## Support Links

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Anthropic API Docs](https://docs.anthropic.com)

---

## Quick Commands Reference

```bash
# Local development
npm run dev

# Build locally (test before deploy)
npm run build
npm start

# Deploy to production
git push origin main

# View logs
vercel logs your-project-url
```

---

Your app is now live! 🚀

Share the URL with your team and start testing the workflow.
