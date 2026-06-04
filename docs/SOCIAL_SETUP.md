# Social OAuth setup

The OAuth code is **already built** (connect flow, token exchange + refresh,
encrypted storage, per-agent connections). To turn a platform on you only need
to (1) create a developer app on that platform, (2) paste its credentials into
Vercel, and (3) make sure the production callback URL matches exactly.

## The constants for this project

| Thing | Value |
| --- | --- |
| Production domain | `https://real-estate-marketing-agent-khaki.vercel.app` |
| Callback URL pattern | `https://real-estate-marketing-agent-khaki.vercel.app/api/social/callback/<platform>` |

> The per-deploy URLs (`…-d97z7qccp-…vercel.app`) change on every push — **do not**
> use them for OAuth. Always use the stable `…-khaki.vercel.app` alias above. If
> you later add a custom domain, update `NEXT_PUBLIC_APP_URL` and the platform
> redirect URIs to the new domain.

## Env vars these flows read (set in Vercel → Project → Settings → Environment Variables → Production)

| Var | Needed for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | **all** | Must be `https://real-estate-marketing-agent-khaki.vercel.app`. The callback URL is built from this — if it's wrong/localhost, the platform rejects the redirect. |
| `SOCIAL_TOKEN_ENC_KEY` | **all** | 32-byte base64. Encrypts stored tokens. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. |
| `META_APP_ID` / `META_APP_SECRET` | Instagram + Facebook | Same Meta app powers both. |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn | |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | X / Twitter | OAuth 2.0 (PKCE). |

After adding/changing any env var in Vercel you must **redeploy** for it to take effect.

## ⚠️ Deployment Protection must be off (or OAuth callbacks 403)

If **Project → Settings → Deployment Protection → Vercel Authentication** is on,
every route (including `/api/social/callback/*` and your public lead pages) is
behind a login wall, so the platform's redirect back to us hits a `403`. Turn it
off for Production, or attach a custom domain that isn't protected.

---

## Instagram (chosen first) — via the Meta Graph API

Instagram publishing runs through a **Meta app** and requires an Instagram
**Business/Creator** account linked to a Facebook Page. It's the most involved
platform (Business Verification + App Review for public use), but you can test it
with your own account before review.

### Step 1 — Prepare the Instagram account (one-time, in the IG app)
1. Convert the IG account to **Professional → Business** (Settings → Account type and tools).
2. Create or pick a **Facebook Page** and **link the IG account to it**
   (IG app → Settings → Business tools and controls → linked accounts, or from the Page).

### Step 2 — Create the Meta app (developers.facebook.com)
1. **My Apps → Create App.**
2. "What do you want to do?" → choose **Other** → app type **Business**.
3. Name it (e.g. *Marquee Social*), set the contact email, create.

### Step 3 — Add products + the redirect URI
1. Add the **Facebook Login for Business** (or **Facebook Login**) product.
2. Facebook Login → **Settings → Valid OAuth Redirect URIs**, add both:
   ```
   https://real-estate-marketing-agent-khaki.vercel.app/api/social/callback/instagram
   https://real-estate-marketing-agent-khaki.vercel.app/api/social/callback/facebook
   ```
3. Add the **Instagram** product (Instagram Graph API / "Instagram" → API setup with Instagram login is fine for Business publishing).

### Step 4 — Copy credentials
- **App ID** (top of dashboard) → `META_APP_ID`
- **App Secret** (Settings → Basic → Show) → `META_APP_SECRET`

### Step 5 — Set the env vars in Vercel (Production) and redeploy
```
META_APP_ID=<from step 4>
META_APP_SECRET=<from step 4>
NEXT_PUBLIC_APP_URL=https://real-estate-marketing-agent-khaki.vercel.app
SOCIAL_TOKEN_ENC_KEY=<32-byte base64 — generate one and keep it secret>
```

### Step 6 — Test before App Review
While the app is in **Development mode**, only people with a **role** on the app
can authorize. Add yourself: **App Roles → Roles → add your account as Admin/Tester.**
Then in the app go to **Profile → Connections → Connect Instagram** and complete
the flow. A connected account will appear here and in **Company → Connections**.

### Step 7 — Go live for other agents (App Review)
To let any agent connect (not just app-role testers) you must:
1. Complete **Business Verification** (Meta Business settings).
2. Submit **App Review** for: `instagram_basic`, `instagram_content_publish`,
   `pages_show_list`, `business_management` (these are the scopes the code requests),
   with a screencast of the connect + publish flow.
3. Switch the app to **Live** once approved.

Until approved, publishing for non-testers falls back to **manual export**
(download the graphic + copy the caption) — the queue and UI are identical, so
approval simply flips the platform to live posting.

---

## The other platforms (for later)

### X / Twitter — fastest, no review for basic posting
1. developer.twitter.com → Developer Portal → create a Project + App.
2. **User authentication settings**: enable **OAuth 2.0**, app type
   *Web App / Confidential client*, scopes `tweet.read tweet.write users.read offline.access`.
3. Callback URL: `https://real-estate-marketing-agent-khaki.vercel.app/api/social/callback/twitter`
4. Copy **Client ID + Client Secret** → `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET`, redeploy.

### LinkedIn
1. linkedin.com/developers → Create app (tied to a Company Page).
2. Add the **Sign In with LinkedIn using OpenID Connect** product; request
   **Community Management API** for `w_member_social` (posting).
3. Auth → redirect URL: `https://real-estate-marketing-agent-khaki.vercel.app/api/social/callback/linkedin`
4. Copy **Client ID + Secret** → `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`, redeploy.

### Facebook (Pages)
Same Meta app as Instagram. Scopes the code requests: `pages_show_list`,
`pages_manage_posts`, `pages_read_engagement` — also App-Review gated.

---

## How to tell it worked
- **Profile → Connections** shows the connected account with its label.
- **Company → Connections** shows it in the per-agent coverage matrix.
- Token is stored encrypted in `social_accounts` (never in plaintext, never in the browser).
- If a platform isn't configured, **Connect** returns a friendly 503 and posting
  uses manual export — nothing breaks.
