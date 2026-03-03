# LinkedIn OAuth Authentication Setup Guide

This guide provides step-by-step instructions for setting up LinkedIn OAuth authentication in your application using Supabase.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Create a LinkedIn App](#create-a-linkedin-app)
3. [Configure LinkedIn App Settings](#configure-linkedin-app-settings)
4. [Get Your LinkedIn OAuth Credentials](#get-your-linkedin-oauth-credentials)
5. [Configure Supabase](#configure-supabase)
6. [Update Environment Variables](#update-environment-variables)
7. [Testing the Integration](#testing-the-integration)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:
- A LinkedIn account (preferably a company/business account for production apps)
- Access to your Supabase project dashboard
- Your application's production URL (or localhost for development)

---

## Create a LinkedIn App

### Step 1: Access LinkedIn Developers Portal
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Click on **"My Apps"** in the top navigation
3. Sign in with your LinkedIn account if not already logged in

### Step 2: Create a New App
1. Click the **"Create app"** button
2. Fill in the required information:
   - **App name**: Your application name (e.g., "Praxis")
   - **LinkedIn Page**: Select or create a LinkedIn Company Page (required)
     - If you don't have one, click "Create a new LinkedIn Page"
     - Fill in company details and create the page
   - **Privacy policy URL**: Your app's privacy policy URL
   - **App logo**: Upload a logo (minimum 100x100px)
   - **Legal agreement**: Check the box to agree to LinkedIn's terms

3. Click **"Create app"**

---

## Configure LinkedIn App Settings

### Step 3: Verify Your App
1. After creating the app, you'll be redirected to the app settings page
2. Navigate to the **"Settings"** tab
3. Under **"App Settings"**, you may need to verify your app:
   - LinkedIn will provide a verification URL
   - Add this URL to your website or follow their verification process

### Step 4: Request Access to Sign In with LinkedIn using OpenID Connect
1. In your app dashboard, go to the **"Products"** tab
2. Find **"Sign In with LinkedIn using OpenID Connect"**
3. Click **"Request access"** or **"Select"**
4. Wait for approval (usually instant for development, may take time for production)

### Step 5: Configure OAuth 2.0 Settings
1. Go to the **"Auth"** tab in your app settings
2. Under **"OAuth 2.0 settings"**, you'll see:
   - **Client ID**: Your LinkedIn app's client ID
   - **Client Secret**: Your LinkedIn app's client secret (click "Show" to reveal)

3. **Add Redirect URLs**:
   - Click on the pencil icon next to "Authorized redirect URLs for your app"
   - Add your Supabase callback URL:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
   - For local development, also add:
     ```
     http://localhost:54321/auth/v1/callback
     ```
   - Click **"Update"**

**Important**: Replace `<your-project-ref>` with your actual Supabase project reference ID. You can find this in your Supabase project URL or settings.

---

## Get Your LinkedIn OAuth Credentials

### Step 6: Copy Your Credentials
From the **"Auth"** tab:

1. **Client ID**: Copy this value
   - Example format: `86xxxxxxxxxxxxxx`

2. **Client Secret**: Click "Show" and copy this value
   - Example format: `WPLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Security Note**: Keep your Client Secret secure and never commit it to version control!

---

## Configure Supabase

### Step 7: Add LinkedIn Provider to Supabase
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** → **Providers** in the left sidebar
4. Scroll down and find **"LinkedIn (OIDC)"** in the provider list
5. Click on **LinkedIn (OIDC)** to expand the settings

### Step 8: Configure LinkedIn Provider in Supabase
1. Toggle **"Enable Sign in with LinkedIn"** to ON
2. Enter your LinkedIn credentials:
   - **Client ID**: Paste the Client ID from LinkedIn
   - **Client Secret**: Paste the Client Secret from LinkedIn
3. Under **"Callback URL (for LinkedIn)"**, you'll see your Supabase callback URL
   - This should match what you added in LinkedIn's redirect URLs
   - Example: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Click **"Save"**

---

## Update Environment Variables

### Step 9: Configure Your Application
Your application is already configured to use LinkedIn OAuth through Supabase. The code in `components/AuthForm.tsx` uses the `linkedin_oidc` provider.

**No additional environment variables are needed** because Supabase handles the OAuth flow. Your existing Supabase credentials are sufficient:

```env
# .env.local (these should already exist)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Testing the Integration

### Step 10: Test LinkedIn Sign-In

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to your auth page**:
   - Go to `http://localhost:3000/auth` (or wherever your auth form is)

3. **Click "Continue with LinkedIn"**:
   - You should be redirected to LinkedIn's authorization page
   - Sign in with your LinkedIn account
   - Authorize the app to access your profile information

4. **Verify the callback**:
   - After authorization, you should be redirected back to your app
   - Check that the user is authenticated
   - Verify user data is stored in Supabase

5. **Check Supabase Dashboard**:
   - Go to **Authentication** → **Users**
   - You should see the new user with LinkedIn as the provider

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Redirect URI Mismatch"
**Error**: LinkedIn shows an error about redirect URI not matching

**Solution**:
- Verify the redirect URL in LinkedIn matches exactly: `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Check for trailing slashes or http vs https
- Ensure you've saved the redirect URL in LinkedIn's Auth settings

#### Issue 2: "Invalid Client ID or Secret"
**Error**: Authentication fails with invalid credentials

**Solution**:
- Double-check the Client ID and Client Secret in Supabase
- Make sure you copied the entire secret (they can be long)
- Verify the LinkedIn app is verified and has "Sign In with LinkedIn using OpenID Connect" enabled

#### Issue 3: "Product Not Enabled"
**Error**: LinkedIn says the product is not available

**Solution**:
- Go to LinkedIn app's "Products" tab
- Ensure "Sign In with LinkedIn using OpenID Connect" is selected and approved
- Wait for approval if pending (can take a few hours)

#### Issue 4: User Data Not Appearing
**Error**: User signs in but data doesn't appear in Supabase

**Solution**:
- Check your auth callback route (`app/auth/callback/route.ts`)
- Verify the callback is properly exchanging the code for a session
- Check browser console for errors
- Review Supabase logs in the dashboard

#### Issue 5: "Company Page Required"
**Error**: Can't create LinkedIn app without a company page

**Solution**:
- Create a LinkedIn Company Page (even a simple one for testing)
- Go to LinkedIn → Work → Create a Company Page
- Fill in basic information
- Use this page when creating your app

#### Issue 6: Development vs Production URLs
**Error**: Works locally but not in production (or vice versa)

**Solution**:
- Add both development and production redirect URLs in LinkedIn:
  - Development: `http://localhost:54321/auth/v1/callback`
  - Production: `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Ensure your Supabase project is configured correctly for both environments

---

## Additional Configuration Options

### Requesting Additional Scopes
By default, LinkedIn OIDC provides basic profile information. If you need additional data:

1. In your code, modify the OAuth call to include scopes:
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'openid profile email', // Add additional scopes as needed
    },
})
```

2. In LinkedIn app settings, ensure you have access to the required products/APIs

### Customizing User Metadata
You can access LinkedIn user data after authentication:

```typescript
const { data: { user } } = await supabase.auth.getUser()
console.log(user?.user_metadata) // Contains LinkedIn profile data
```

---

## Security Best Practices

1. **Never expose your Client Secret**: Keep it in Supabase only, never in client-side code
2. **Use HTTPS in production**: LinkedIn requires HTTPS for redirect URLs in production
3. **Validate redirect URLs**: Only add trusted URLs to LinkedIn's authorized redirect list
4. **Monitor authentication logs**: Regularly check Supabase logs for suspicious activity
5. **Implement rate limiting**: Protect your auth endpoints from abuse
6. **Keep credentials rotated**: Periodically regenerate your Client Secret

---

## Resources

- [LinkedIn OAuth 2.0 Documentation](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [LinkedIn Developers Portal](https://www.linkedin.com/developers/)
- [Supabase LinkedIn Provider Guide](https://supabase.com/docs/guides/auth/social-login/auth-linkedin)

---

## Summary Checklist

Before going live, ensure you've completed:

- [ ] Created a LinkedIn app
- [ ] Verified the LinkedIn app
- [ ] Enabled "Sign In with LinkedIn using OpenID Connect"
- [ ] Added correct redirect URLs in LinkedIn
- [ ] Copied Client ID and Client Secret
- [ ] Configured LinkedIn provider in Supabase
- [ ] Tested sign-in flow in development
- [ ] Tested sign-in flow in production
- [ ] Verified user data appears in Supabase
- [ ] Implemented proper error handling
- [ ] Added security measures (rate limiting, etc.)

---

## Need Help?

If you encounter issues not covered in this guide:
1. Check Supabase logs in your dashboard
2. Review LinkedIn app logs in the developer portal
3. Consult the official documentation linked above
4. Check browser console for client-side errors
5. Review network requests in browser DevTools

---

**Last Updated**: January 2026
**Version**: 1.0
