# Decision records

Each significant technical decision gets one numbered file. Records are never rewritten to change their decision; a new record supersedes the old one, and the old one's status is updated to point forward.

| # | Title | Status | Date |
|---|---|---|---|
| 0001 | Supabase as the data, auth, and storage platform | Accepted | 2026-05-29 |
| 0002 | Single schema for both brokerage orgs and solo agents | Accepted | 2026-05-29 |
| 0003 | Pluggable stub/paid providers for image and video generation | Accepted | 2026-05-29 |
| 0004 | Per-seat Stripe pricing with seat blocks | Accepted | 2026-06-01 |
| 0005 | ops-agents as a standalone service inside this repository | Accepted | 2026-06-04 |

Dates are the earliest commit evidence found for each decision (`git log`), not necessarily the day the decision was made; where the two differ, that gap is itself `UNKNOWN`.
