# Vercel Deployment Guide

This guide will help you deploy the E Power Security Job Board to Vercel.

## Prerequisites

- A Vercel account (sign up at [vercel.com](https://vercel.com))
- Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to Git**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import Project to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Vercel will automatically detect it's a Vite project

3. **Configure Environment Variables**
   - In the Vercel project settings, go to "Environment Variables"
   - Add the following variables:
     - `VITE_SUPABASE_URL` - Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key
   - Note: The app has default values, but it's recommended to set these for production

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your app automatically
   - Your app will be live at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts
   - For production deployment, use `vercel --prod`

4. **Set Environment Variables**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

## Environment Variables

The following environment variables can be set in Vercel:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Optional (has default) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Optional (has default) |

**Note:** In Vercel, environment variables starting with `VITE_` are automatically exposed to the client-side code.

## Build Configuration

The project is configured with `vercel.json`:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Vite (auto-detected)
- **Node Version**: Uses Vercel's default (Node.js 18.x)

## Post-Deployment

After deployment:

1. **Verify the deployment**
   - Visit your Vercel deployment URL
   - Check that jobs are loading from Supabase
   - Test search and filter functionality

2. **Set up Custom Domain (Optional)**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

3. **Enable Automatic Deployments**
   - Vercel automatically deploys on every push to your main branch
   - Preview deployments are created for pull requests

## Troubleshooting

### Build Fails

- Check the build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Environment Variables Not Working

- Make sure variables start with `VITE_` prefix
- Redeploy after adding new environment variables
- Check that variables are set for the correct environment (Production, Preview, Development)

### Supabase Connection Issues

- Verify Supabase URL and keys are correct
- Check Supabase dashboard for any service issues
- Ensure RLS policies allow public read access to jobs table

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)
- [Supabase Documentation](https://supabase.com/docs)

