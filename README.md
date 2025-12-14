# E Power Security - Job Board

A modern React application for E Power Security's job board, built with React and Tailwind CSS.

## Features

- Responsive design with dark theme
- Job listings with filtering capabilities
- Search functionality
- Company statistics display
- Modern UI with Material Symbols icons
- **Supabase integration** for dynamic job data management
- Real-time job filtering and search

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Deployment

This app is ready to deploy to Vercel. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

1. Push your code to GitHub/GitLab/Bitbucket
2. Import your repository at [vercel.com/new](https://vercel.com/new)
3. Vercel will automatically detect and configure the project
4. Add environment variables in Vercel dashboard (optional):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy!

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Material Symbols** - Icon library
- **Supabase** - Backend as a Service (Database, Authentication, Storage)

## Project Structure

```
Screening/
├── src/
│   ├── App.jsx                    # Main application component
│   ├── main.jsx                   # React entry point
│   ├── index.css                  # Global styles and Tailwind imports
│   ├── lib/
│   │   └── supabase.js            # Supabase client configuration
│   └── contexts/
│       └── SupabaseContext.jsx    # Supabase context provider
├── index.html                     # HTML template
├── package.json                   # Dependencies and scripts
├── tailwind.config.js            # Tailwind configuration
├── postcss.config.js             # PostCSS configuration
├── vite.config.js                # Vite configuration
└── .env.local                    # Environment variables (optional)
```

## Supabase Setup

The app is pre-configured with Supabase credentials. The jobs table has been created in your Supabase database with sample data.

### Environment Variables (Optional)

If you want to use a different Supabase project, create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The app will work with the default credentials if no `.env.local` file is present.

### Database Schema

The `jobs` table includes:
- `id` - Primary key
- `title` - Job title
- `location` - Job location
- `salary` - Salary information
- `type` - Employment type (Full-time, Part-time, etc.)
- `shift` - Shift information
- `image` - Job image URL
- `badge_text`, `badge_icon`, `badge_color` - Optional badge information
- `category` - Job category (Armed Guard, Unarmed, CCTV Operator, Patrol)
- `description` - Job description (optional)
- `created_at`, `updated_at` - Timestamps

## Customization

The color scheme and styling can be customized in `tailwind.config.js`. The theme includes:

- Primary color: `#2bee79` (bright green)
- Secondary color: `#234832` (dark green)
- Background colors for light and dark modes
- Custom font family (Spline Sans)

# Candidate_Screening
