# Vercel Environment Variables

Set these in **Vercel Dashboard → Project → Settings → Environment Variables**.

> ⚠️ Never commit real values to git. Set them only in the Vercel dashboard.

---

## Required

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_URL` | `https://golineless.com` | Backend API base URL (your cPanel server). All API calls use this. |
| `VITE_GOOGLE_CLIENT_ID` | `168703915655-...apps.googleusercontent.com` | Google OAuth client ID for sign-in button. |

## Optional (enables specific features)

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_NEON_AUTH_URL` | `https://ep-little-star-adoyze1m.neonauth.c-2.us-east-1.aws.neon.tech/neondb/auth` | Neon Auth endpoint for magic-link sign-in. |

## How to set

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your **golineless** project
3. Click **Settings** → **Environment Variables**
4. Add each variable above
5. Set the environment to **Production**, **Preview**, and **Development** (or at minimum **Production**)
6. Click **Save**
7. Go to **Deployments** → click **Redeploy** on the latest deployment to apply the new env vars

## Verifying

After deployment, open your Vercel URL and check the browser console:

```js
// Should print your API URL
console.log(import.meta.env.VITE_API_URL)
// Should print your Google client ID
console.log(import.meta.env.VITE_GOOGLE_CLIENT_ID)
```

## Vercel CLI alternative

You can also set env vars from the terminal:

```bash
vercel env add VITE_API_URL production
# Paste: https://golineless.com

vercel env add VITE_GOOGLE_CLIENT_ID production
# Paste: 168703915655-...apps.googleusercontent.com

vercel env add VITE_NEON_AUTH_URL production
# Paste: https://ep-little-star-adoyze1m.neonauth.c-2.us-east-1.aws.neon.tech/neondb/auth
```
