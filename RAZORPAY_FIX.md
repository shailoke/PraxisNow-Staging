# Razorpay Configuration Fix

## Problem
The Razorpay payment integration is failing with the error:
> "Payment Failed because of a configuration error. Authentication key was missing during initialization."

## Root Cause
The environment variable `NEXT_PUBLIC_RAZORPAY_KEY_ID` is not set in your `.env.local` file.

## Solution

### Step 1: Add Razorpay Keys to Environment Variables

Open your `.env.local` file and add the following line:

```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id_here
```

**Important Notes:**
- The `NEXT_PUBLIC_` prefix is required for Next.js to expose this variable to the browser
- You should already have `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in your `.env.local` for the backend
- The public key (key_id) is safe to expose to the browser - it's meant to be public
- Never expose the `RAZORPAY_KEY_SECRET` to the browser (don't add `NEXT_PUBLIC_` prefix to it)

### Step 2: Get Your Razorpay Keys

1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **API Keys**
3. Copy your **Key ID** (this is your public key)
4. Copy your **Key Secret** (keep this private, only use on backend)

### Step 3: Update Your .env.local File

Your `.env.local` should have both:

```env
# Backend keys (already configured)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx

# Frontend key (ADD THIS)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
```

Note: `NEXT_PUBLIC_RAZORPAY_KEY_ID` should have the **same value** as `RAZORPAY_KEY_ID`.

### Step 4: Restart Your Development Server

After updating `.env.local`, you **must** restart your Next.js development server:

1. Stop the current server (Ctrl+C)
2. Run `npm run dev` again

Environment variables are only loaded when the server starts, so changes won't take effect until you restart.

## Verification

After completing these steps:
1. Navigate to the pricing page
2. Click "Buy Now" on any pack
3. The Razorpay checkout should open successfully

## Code Changes Made

I've also improved the error handling in `app/pricing/page.tsx` to:
- Validate that the Razorpay key exists before attempting payment
- Show clearer error messages if the key is missing
- Check if the Razorpay script is loaded before opening checkout
- Provide better error feedback to users

## Test vs Production Keys

- **Test keys** start with `rzp_test_` - use these for development
- **Production keys** start with `rzp_live_` - use these only in production
- Make sure you're using test keys in development!
