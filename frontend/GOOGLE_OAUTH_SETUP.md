# Google OAuth Setup Guide

To enable Google sign-in functionality, you need to set up Google OAuth credentials.

## Steps to Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)

2. **Create a New Project (or select existing)**
   - Click on the project dropdown at the top
   - Click "New Project"
   - Enter a project name (e.g., "My Recipe Book")
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" or "Google Identity"
   - Click on it and enable it

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen first:
     - Choose "External" (unless you have a Google Workspace)
     - Fill in the required fields (App name, User support email, Developer contact)
     - Add scopes: `email`, `profile`, `openid`
     - Add test users if in testing mode
   - Back to creating credentials:
     - Application type: "Web application"
     - Name: "My Recipe Book Web Client"
     - Authorized JavaScript origins:
       - `http://localhost:3000` (for development)
       - Your production URL (for production)
     - Authorized redirect URIs:
       - `http://localhost:3000/api/auth/callback/google` (for development)
       - `https://yourdomain.com/api/auth/callback/google` (for production)
   - Click "Create"
   - Copy the **Client ID** and **Client Secret**

5. **Set Up Environment Variables**
   - Create a `.env.local` file in the `frontend` directory (if it doesn't exist)
   - Add the following:
     ```env
     NEXTAUTH_URL=http://localhost:3000
     NEXTAUTH_SECRET=your-secret-key-here
     GOOGLE_CLIENT_ID=your-client-id-here
     GOOGLE_CLIENT_SECRET=your-client-secret-here
     ```

6. **Generate NEXTAUTH_SECRET**
   - You can generate a secret using:
     ```bash
     openssl rand -base64 32
     ```
   - Or use any random string generator

## Important Notes

- **Never commit** `.env.local` to version control (it's already in `.gitignore`)
- For production, update the authorized redirect URIs in Google Cloud Console
- The OAuth consent screen may need verification if you're making the app public
- Test users can be added during development/testing phase

## Testing

After setting up:
1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000/login`
3. Click "Sign in with Google"
4. You should be redirected to Google's sign-in page

