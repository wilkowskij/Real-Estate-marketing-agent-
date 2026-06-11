import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Marquee",
  description: "How Marquee collects, uses, and protects your data.",
};

const CONTACT_EMAIL = "privacy@getmarquee.co";
const LAST_UPDATED = "June 10, 2025";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="bg-navy px-6 py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="font-display text-2xl text-paper">
            Marquee
          </Link>
          <Link href="/login" className="text-sm text-gold-soft hover:text-gold">
            Sign in
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl text-navy">Privacy Policy</h1>
        <p className="mt-2 text-sm text-ink-muted">Last updated: {LAST_UPDATED}</p>

        <p className="mt-6 text-ink">
          Marquee (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is an AI-powered social media marketing
          platform built for real estate professionals. This Privacy Policy explains what information
          we collect, how we use it, and your rights regarding your data. By using Marquee you agree
          to the practices described here.
        </p>

        <Section title="1. Information We Collect">
          <Subsection title="Account information">
            When you create an account we collect your name, email address, and password (stored as
            a salted hash — we never store plaintext passwords). If you belong to a brokerage
            organisation, we also store your role within that organisation.
          </Subsection>

          <Subsection title="Brand and listing content">
            To generate marketing content we collect information you provide: your brokerage name,
            logo, brand colours, brand voice preferences, listing details (address, price, bedrooms,
            bathrooms, square footage, description), and any photos you upload.
          </Subsection>

          <Subsection title="Social media account tokens">
            When you connect a Facebook Page, Instagram Business account, LinkedIn profile, or X
            (Twitter) account, we receive and store OAuth access tokens issued by those platforms.
            These tokens are encrypted at rest using AES-256-GCM before being written to our
            database. We never store your social media passwords.
          </Subsection>

          <Subsection title="Usage data">
            We collect standard server logs including IP addresses, browser type, pages visited, and
            timestamps. This data is used solely for security, debugging, and product improvement.
          </Subsection>

          <Subsection title="Billing information">
            Payment card details are handled entirely by Stripe. Marquee stores only your
            Stripe customer ID and subscription status — never raw card numbers or CVV codes.
          </Subsection>
        </Section>

        <Section title="2. How We Use Your Information">
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink">
            <li>
              <strong>Content generation:</strong> Your listing details, brand voice, and area
              preferences are sent to Anthropic&apos;s Claude API to generate social media captions and
              marketing copy. No personal data beyond what you explicitly provide for a post is
              included in these requests.
            </li>
            <li>
              <strong>Social publishing:</strong> With your explicit authorisation, we use your
              stored OAuth tokens to publish approved posts to your connected social media accounts
              on your behalf.
            </li>
            <li>
              <strong>Scheduling and automation:</strong> We use your data to run scheduled
              publishing jobs and recurring content workflows you configure.
            </li>
            <li>
              <strong>Platform communications:</strong> We may send transactional emails (post
              published, token expiring, billing receipts). We do not send marketing emails without
              your consent.
            </li>
            <li>
              <strong>Service improvement:</strong> Aggregate, anonymised usage patterns help us
              improve the product. We do not sell individual user data.
            </li>
          </ul>
        </Section>

        <Section title="3. Facebook and Instagram Data">
          <p className="mt-3 text-ink">
            Marquee integrates with the Meta Graph API to publish content to Facebook Pages and
            Instagram Business accounts. When you connect your Meta accounts:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink">
            <li>
              We request only the permissions necessary for publishing:{" "}
              <code className="rounded bg-paper-line px-1 text-xs">pages_show_list</code>,{" "}
              <code className="rounded bg-paper-line px-1 text-xs">pages_manage_posts</code>,{" "}
              <code className="rounded bg-paper-line px-1 text-xs">pages_read_engagement</code>,{" "}
              <code className="rounded bg-paper-line px-1 text-xs">instagram_basic</code>, and{" "}
              <code className="rounded bg-paper-line px-1 text-xs">instagram_content_publish</code>.
            </li>
            <li>
              We do not access your personal Facebook profile, friends list, messages, or any data
              beyond what is required to publish to your Page and Instagram account.
            </li>
            <li>
              Access tokens are encrypted using AES-256-GCM and stored in our database. They are
              used exclusively to post content you have approved and scheduled within Marquee.
            </li>
            <li>
              We do not share your Meta access tokens with any third party other than Meta&apos;s own
              API endpoints.
            </li>
            <li>
              Token permissions expire periodically. We refresh them automatically using
              Meta&apos;s token extension mechanism, or we will prompt you to reconnect your account.
            </li>
          </ul>
        </Section>

        <Section title="4. Data Sharing and Third Parties">
          <p className="mt-3 text-ink">
            We share data only with the following categories of service providers, solely to
            operate the platform:
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-paper-line">
            <table className="w-full text-sm">
              <thead className="bg-paper-line">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-navy">Provider</th>
                  <th className="px-4 py-3 text-left font-semibold text-navy">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-line">
                {[
                  ["Supabase", "Database, authentication, and file storage"],
                  ["Anthropic (Claude API)", "AI content generation from your listing briefs"],
                  ["Meta (Facebook / Instagram)", "Publishing posts to your connected Pages and IG accounts"],
                  ["LinkedIn", "Publishing posts to your connected LinkedIn profile"],
                  ["X Corp (Twitter)", "Publishing posts to your connected X account"],
                  ["Stripe", "Subscription billing and payment processing"],
                  ["Vercel", "Application hosting and edge delivery"],
                ].map(([provider, purpose]) => (
                  <tr key={provider}>
                    <td className="px-4 py-3 font-medium text-navy">{provider}</td>
                    <td className="px-4 py-3 text-ink-muted">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-ink">
            We do not sell, rent, or trade your personal information to any third party for
            marketing or advertising purposes.
          </p>
        </Section>

        <Section title="5. Data Retention">
          <p className="mt-3 text-ink">
            We retain your account data for as long as your account is active. Disconnecting a
            social media account immediately deletes the associated OAuth tokens from our database.
            If you delete your Marquee account, all associated data — including posts, brand
            settings, and social tokens — is permanently deleted within 30 days.
          </p>
        </Section>

        <Section title="6. Data Security">
          <p className="mt-3 text-ink">
            We take reasonable technical and organisational measures to protect your data:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink">
            <li>All data in transit is encrypted via TLS 1.2+.</li>
            <li>OAuth tokens are encrypted at rest with AES-256-GCM using a server-side key.</li>
            <li>Database access is governed by row-level security policies — users can only access their own organisation&apos;s data.</li>
            <li>Passwords are hashed using bcrypt and never stored in plaintext.</li>
            <li>Payment card data is never stored on our servers (handled by Stripe).</li>
          </ul>
        </Section>

        <Section title="7. Your Rights">
          <p className="mt-3 text-ink">
            Depending on your jurisdiction, you may have the right to:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink">
            <li><strong>Access</strong> the personal data we hold about you.</li>
            <li><strong>Correct</strong> inaccurate data via your account settings.</li>
            <li><strong>Delete</strong> your account and all associated data (see below).</li>
            <li><strong>Disconnect</strong> any social media account at any time from Profile → Connections.</li>
            <li><strong>Export</strong> your scheduled post data via the CSV export on the Calendar page.</li>
            <li><strong>Object</strong> to or restrict certain processing of your data.</li>
          </ul>
          <p className="mt-4 text-ink">
            To exercise any of these rights, email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-deep underline">
              {CONTACT_EMAIL}
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section title="8. Data Deletion">
          <p className="mt-3 text-ink">
            You can remove Marquee&apos;s access to your Facebook and Instagram accounts at any time:
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-ink">
            <li>
              <strong>Within Marquee:</strong> Go to <em>Profile → Connections</em> and click
              &quot;Disconnect&quot; next to any connected account. This immediately deletes the stored
              access token.
            </li>
            <li>
              <strong>Via Facebook:</strong> Go to{" "}
              <em>Facebook Settings → Security and Login → Apps and Websites</em>, find Marquee,
              and click Remove. Facebook will notify us and we will delete all associated data
              within 30 days.
            </li>
            <li>
              <strong>Full account deletion:</strong> Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-deep underline">
                {CONTACT_EMAIL}
              </a>{" "}
              with the subject line &quot;Delete my account&quot; and we will permanently erase all your
              data within 30 days.
            </li>
          </ol>
        </Section>

        <Section title="9. Cookies">
          <p className="mt-3 text-ink">
            Marquee uses only essential, functional cookies — specifically short-lived httpOnly
            cookies during the OAuth connection flow (to carry CSRF state tokens). We do not use
            tracking cookies, advertising cookies, or third-party analytics cookies.
          </p>
        </Section>

        <Section title="10. Children's Privacy">
          <p className="mt-3 text-ink">
            Marquee is intended for real estate professionals and is not directed at children under
            the age of 13. We do not knowingly collect personal data from children. If you believe
            a child has provided us with personal data, please contact us and we will delete it
            promptly.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p className="mt-3 text-ink">
            We may update this Privacy Policy from time to time. When we do, we will update the
            &quot;Last updated&quot; date at the top of this page and, for material changes, notify you by
            email. Continued use of Marquee after changes take effect constitutes acceptance of the
            updated policy.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p className="mt-3 text-ink">
            If you have questions or concerns about this Privacy Policy or how we handle your data,
            please contact us:
          </p>
          <address className="mt-4 not-italic rounded-xl border border-paper-line bg-white p-5 text-sm text-ink">
            <p className="font-semibold text-navy">Marquee</p>
            <p className="mt-1">
              Email:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-deep underline">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="mt-1">Website: getmarquee.co</p>
          </address>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-paper-line px-6 py-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
          <span>© {new Date().getFullYear()} Marquee. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-ink hover:underline">
              Terms of Service
            </Link>
            <Link href="/login" className="hover:text-ink hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-navy">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function Subsection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <h3 className="font-semibold text-navy">{title}</h3>
      <p className="mt-1 text-ink">{children}</p>
    </div>
  );
}
