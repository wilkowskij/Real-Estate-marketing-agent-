# Branded confirmation email — setup

The signup confirmation email is branded and links back into the app. The HTML
template lives at [`docs/email-templates/confirm-signup.html`](email-templates/confirm-signup.html).
Email templates can't be set from code, so paste it into Supabase once.

## Steps (Supabase dashboard)

1. **Auth → URL Configuration**
   - **Site URL** = your production domain, e.g. `https://app.yourdomain.com`
     (this is what `{{ .SiteURL }}` resolves to in the email).
   - **Redirect URLs** → add `https://app.yourdomain.com/auth/confirm`.
2. **Auth → Email Templates → "Confirm signup"**
   - **Subject:** `Confirm your email to start your Marquee studio`
   - **Message body:** paste the contents of
     `docs/email-templates/confirm-signup.html`.
   - Save.

That's it. New signups now receive the branded email; the button verifies the
address and drops the user into `/dashboard`, already signed in.

## How it works (code)

- `components/AuthForm.tsx` calls `signUp` with
  `emailRedirectTo: <origin>/auth/confirm?next=/dashboard`.
- The email button links to
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard`.
- `app/auth/confirm/route.ts` calls `verifyOtp({ type, token_hash })` (which sets
  the session cookie) and redirects to `next` (default `/dashboard`). On an
  invalid/expired link it redirects to `/login?verify=failed`, where the login
  page shows a friendly "resend" message.

> The same pattern works for the **password recovery** and **invite** emails —
> brand those templates similarly and point them at `/auth/confirm` with the
> matching `type` (`recovery`, `invite`).
