# Debugging "Invalid Email" Error

The error "Email address is invalid" usually comes from one of 3 places:

1. **Whitespace**: `user@example.com ` (Fixed by the `.trim()` update I just made)
2. **Domain Blocking**: Some Supabase projects block `example.com`. **Try `test@gmail.com`**.
3. **Redirect URL Issues**: If the redirect URL isn't allowlisted. (I temporarily disabled this in the code to test).

## Validation Steps

1. **Check Your Terminal**
   - Ensure `npx supabase start` is actually running.
   - Look for `API URL: http://127.0.0.1:54321`.
   - If my tool failed to connect to port 54321, your local Supabase might be stopped!

2. **Check `.env.local`**
   - If using local: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
   - If using prod: `NEXT_PUBLIC_SUPABASE_URL=https://<id>.supabase.co`
   - Make sure you are hitting the one you think you are.

3. **Try a Real Email Domain**
   - Use `anything@gmail.com` or `anything@outlook.com`.
   - You don't need to own it to test locally (check http://localhost:54324 for the inbox).

4. **Restart Supabase** (If local)
   ```powershell
   npx supabase stop
   npx supabase start
   ```
