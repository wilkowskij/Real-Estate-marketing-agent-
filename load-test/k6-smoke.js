// k6 smoke / load test for Marquee.
//
// Usage:
//   BASE_URL=https://your-domain.com k6 run load-test/k6-smoke.js
//   BASE_URL=... VUS=50 DURATION=1m k6 run load-test/k6-smoke.js
//
// Scenarios:
//   - public:    homepage + a lead landing page + a tracked-link redirect (no auth, safe)
//   - authed:    set COOKIE="sb-...=..." to exercise an authenticated read (dashboard)
//
// NOTE: deliberately does NOT hit AI generation endpoints (/api/campaigns/*),
// which cost money and are bounded by Anthropic/OpenAI rate limits, not the app.

import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const VUS = Number(__ENV.VUS || 50);
const DURATION = __ENV.DURATION || "30s";
const LEAD_SLUG = __ENV.LEAD_SLUG || ""; // optional: a real /l/<slug>
const LINK_SLUG = __ENV.LINK_SLUG || ""; // optional: a real /r/<slug>
const COOKIE = __ENV.COOKIE || ""; // optional: authenticated session cookie

export const options = {
  scenarios: {
    public_load: {
      executor: "constant-vus",
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // <1% errors
    http_req_duration: ["p(95)<800"], // 95% under 800ms
  },
};

export default function () {
  // 1) Marketing homepage (public, cacheable).
  let res = http.get(`${BASE}/`);
  check(res, { "home 200": (r) => r.status === 200 });

  // 2) Lead landing page (public, server-rendered, one DB read).
  if (LEAD_SLUG) {
    res = http.get(`${BASE}/l/${LEAD_SLUG}`);
    check(res, { "landing 200": (r) => r.status === 200 });
  }

  // 3) Tracked-link redirect (public, one atomic counter write + redirect).
  if (LINK_SLUG) {
    res = http.get(`${BASE}/r/${LINK_SLUG}`, { redirects: 0 });
    check(res, { "redirect 30x": (r) => r.status >= 300 && r.status < 400 });
  }

  // 4) Authenticated read path (dashboard) if a cookie is provided.
  if (COOKIE) {
    res = http.get(`${BASE}/dashboard`, { headers: { Cookie: COOKIE } });
    check(res, { "dashboard 200": (r) => r.status === 200 });
  }

  sleep(1);
}
