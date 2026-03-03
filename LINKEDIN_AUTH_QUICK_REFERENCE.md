# LinkedIn OAuth - Quick Reference

## What Was Changed

### 1. Updated `components/AuthForm.tsx`
- ✅ Added `Linkedin` icon import from `lucide-react`
- ✅ Created `handleLinkedInLogin()` function
- ✅ Added LinkedIn sign-in button to the UI (positioned after Google button)
- ✅ Styled with blue accent color to match LinkedIn branding

### 2. Created Documentation
- ✅ `LINKEDIN_AUTH_SETUP_GUIDE.md` - Comprehensive setup guide

---

## Quick Setup Steps

### 1. Create LinkedIn App
- Go to: https://www.linkedin.com/developers/
- Create new app (requires LinkedIn Company Page)
- Enable "Sign In with LinkedIn using OpenID Connect"

### 2. Get Credentials
From LinkedIn app's **Auth** tab:
- **Client ID**: `86xxxxxxxxxxxxxx`
- **Client Secret**: `WPLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. Add Redirect URL in LinkedIn
```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

### 4. Configure Supabase
- Go to: Authentication → Providers → LinkedIn (OIDC)
- Enable the provider
- Add Client ID and Client Secret
- Save

### 5. Test
```bash
npm run dev
```
Navigate to your auth page and click "Continue with LinkedIn"

---

## Important Notes

- **Provider name**: Use `linkedin_oidc` (not just `linkedin`)
- **No additional env vars needed**: Supabase handles everything
- **Redirect URL**: Must match exactly in both LinkedIn and Supabase
- **Company Page**: Required to create LinkedIn app (even for testing)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Redirect URI mismatch | Verify URL matches exactly in LinkedIn settings |
| Invalid credentials | Double-check Client ID/Secret in Supabase |
| Product not enabled | Enable "Sign In with LinkedIn using OpenID Connect" in LinkedIn app |

---

## File Locations

- Auth Component: `components/AuthForm.tsx`
- Full Guide: `LINKEDIN_AUTH_SETUP_GUIDE.md`
- Auth Callback: `app/auth/callback/route.ts` (already configured)

---

## Next Steps

1. Follow the detailed guide in `LINKEDIN_AUTH_SETUP_GUIDE.md`
2. Create your LinkedIn app
3. Configure Supabase with your credentials
4. Test the integration
5. Deploy to production

---

**Need the detailed guide?** See `LINKEDIN_AUTH_SETUP_GUIDE.md` for complete instructions.
