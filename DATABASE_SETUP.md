# Database Schema Setup Guide

This document outlines the database schema and setup instructions for the E Power Security ATS application.

## Database Schema

The application uses four core tables:

1. **jobs** - Job postings (publicly viewable, admin editable)
2. **applicants** - Candidate profiles with personal information
3. **applications** - Links applicants to specific jobs (allows one applicant to apply for multiple jobs)
4. **documents** - Stores file paths from Supabase Storage for uploaded documents

## Setup Instructions

### 1. Database Tables

The database tables have been created via migrations. The schema includes:

- **jobs**: Stores job postings with title, description, location, salary, etc.
- **applicants**: Stores candidate information including reference codes, personal details, qualifications
- **applications**: Links applicants to jobs with application status and progress tracking
- **documents**: Stores document metadata linked to applicants

### 2. Row Level Security (RLS) Policies

RLS policies have been set up to:
- Allow public access to view active jobs
- Restrict applicant data to authenticated users (admins) only
- Allow public to insert applications and documents (for applicants to submit)
- Prevent unauthorized access to sensitive data

### 3. Supabase Storage Bucket Setup

**IMPORTANT**: You must manually create the storage bucket in the Supabase Dashboard.

#### Steps to Create the Storage Bucket:

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `resumes`
   - **Public bucket**: ❌ **Uncheck** (Keep it private for security)
   - **File size limit**: 10 MB (or your preferred limit)
   - **Allowed MIME types**: Leave empty or specify: `application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document`

5. Click **"Create bucket"**

#### Storage Policies

After creating the bucket, set up storage policies:

1. Go to **Storage** → **Policies** → Select the `resumes` bucket
2. Create the following policies:

**Policy 1: Allow public uploads (for applicants)**
```sql
CREATE POLICY "Public can upload documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'resumes');
```

**Policy 2: Allow authenticated users to read (for admins)**
```sql
CREATE POLICY "Authenticated can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resumes');
```

**Policy 3: Allow authenticated users to delete (for admins)**
```sql
CREATE POLICY "Authenticated can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resumes');
```

### 4. Reference Code Generation

A PostgreSQL function `generate_reference_code()` has been created to automatically generate unique reference codes in the format `REF-YYYY-XXX` (e.g., `REF-2025-001`).

The function:
- Generates sequential reference codes per year
- Automatically increments the sequence number
- Returns a unique code for each applicant

### 5. Environment Variables

Ensure your `.env` file (or Vercel environment variables) includes:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Data Flow

### Application Submission Flow:

1. **Step 1 (Personal Info)**: Creates/updates `applicants` record, creates `applications` record
2. **Step 2 (Qualifications)**: Updates `applicants` record with licenses and physical attributes
3. **Step 3 (Documents)**: 
   - Uploads files to Supabase Storage bucket `resumes`
   - Creates `documents` records linking files to applicant
4. **Step 4 (Success)**: Generates final reference code and marks application as submitted

### Admin Dashboard Flow:

1. Fetches `applications` with joined `applicants` and `jobs` data
2. Displays applicant information from the `applicants` table
3. Loads documents from the `documents` table
4. Uses signed URLs to access private storage files

## Security Considerations

1. **Storage Bucket**: Keep the bucket private (not public) to prevent unauthorized access
2. **RLS Policies**: Ensure RLS is enabled on all tables
3. **Signed URLs**: Documents are accessed via time-limited signed URLs (1 hour expiry)
4. **Authentication**: Admin features require authenticated users

## Troubleshooting

### File Upload Issues

If file uploads fail:
1. Verify the `resumes` bucket exists in Storage
2. Check storage policies are correctly configured
3. Verify RLS policies allow public INSERT on storage.objects
4. Check file size limits (default 10MB)

### Reference Code Issues

If reference codes aren't generating:
- The function `generate_reference_code()` should exist in your database
- Check PostgreSQL function permissions
- Fallback: Client-side generation will create codes like `REF-2025-XXX`

### Admin Access Issues

If admins can't view applicants:
- Verify RLS policies allow `authenticated` role to SELECT from `applicants` and `documents`
- Ensure users are logged in (authenticated)
- Check that the `auth.role()` function returns 'authenticated' for logged-in users

## Next Steps

1. ✅ Database tables created
2. ✅ RLS policies configured
3. ⚠️ **Storage bucket must be created manually** (see above)
4. ✅ Application forms updated to use new schema
5. ✅ Admin dashboard updated to use new schema
6. ✅ Reference code generation implemented

After creating the storage bucket, the application should be fully functional!

