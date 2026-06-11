import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Marquee",
  description: "The terms and conditions governing your use of Marquee.",
};

const CONTACT_EMAIL = "legal@getmarquee.co";
const LAST_UPDATED = "June 11, 2025";

export default function TermsPage() {
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
        <h1 className="font-display text-4xl text-navy">Terms of Service</h1>
        <p className="mt-2 text-sm text-ink-muted">Last updated: {LAST_UPDATED}</p>

        <p className="mt-6 text-ink">
          Welcome to Marquee. These Terms of Service (&quot;Terms&quot;) govern your access to and
          use of the Marquee platform, including our website, web application, and any related
          services (collectively, the &quot;Service&quot;), operated by Marquee (&quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;). By creating an account or using the Service you agree to be bound by these
          Terms. If you do not agree, do not use the Service.
        </p>

        <Section title="1. Eligibility">
          <p className="mt-3 text-ink">
            You must be at least 18 years old and have the legal authority to enter into a
            binding contract to use the Service. By using Marquee you represent that you meet
            these requirements. The Service is intended for real estate professionals and
            businesses — by signing up you represent that you are using it for professional or
            commercial purposes.
          </p>
        </Section>

        <Section title="2. Your Account">
          <p className="mt-3 text-ink">
            You are responsible for maintaining the confidentiality of your account credentials
            and for all activity that occurs under your account. You agree to:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink">
            <li>Provide accurate and complete registration information.</li>
            <li>Notify us immediately at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-deep underline">
                {CONTACT_EMAIL}
              </a>{" "}
              if you suspect unauthorised access to your account.
            </li>
            <li>Not share your account with third parties or allow others to use your credentials.</li>
            <li>Keep your contact email current so we can reach you regarding the Service.</li>
          </ul>
        </Section>

        <Section title="3. Acceptable Use">
          <p className="mt-3 text-ink">
            You agree to use the Service only for lawful purposes and in accordance with these
            Terms. You must not:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink">
            <li>
              Use the Service to generate, publish, or distribute content that is defamatory,
              obscene, harassing, threatening, discriminatory, or otherwise unlawful.
            </li>
            <li>
              Violate the Fair Housing Act or any applicable fair housing or anti-discrimination
              laws in content you generate or publish through Marquee.
            </li>
            <li>
              Misrepresent properties, pricing, availability, or material facts in any
              AI-generated or published content.
            </li>
            <li>
              Attempt to reverse-engineer, decompile, or extract source code from the Service.
            </li>
            <li>
              Use automated scripts, bots, or scrapers to access or extract data from the
              Service beyond normal use.
            </li>
            <li>
              Interfere with or disrupt the integrity or performance of the Service or its
              underlying infrastructure.
            </li>
            <li>
              Circumvent any usage limits, subscription gates, or access controls.
            </li>
            <li>
              Resell, sublicense, or make the Service available to third parties without our
              written consent.
            </li>
          </ul>
        </Section>

        <Section title="4. AI-Generated Content">
          <p className="mt-3 text-ink">
            Marquee uses Anthropic&apos;s Claude API to generate marketing copy, captions, and other
            content (&quot;AI Content&quot;). You acknowledge and agree that:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink">
            <li>
              <strong>You are responsible for reviewing AI Content before publishing.</strong>{" "}
              Marquee provides tools to help catch compliance issues, but the final decision
              to publish rests with you.
            </li>
            <li>
              AI Content may be inaccurate, incomplete, or unsuitable for your specific
              circumstances. Always verify facts, figures, and legal compliance before use.
            </li>
            <li>
              You are solely responsible for ensuring that all content you publish through
              Marquee complies with the Fair Housing Act, applicable real estate advertising
              regulations, MLS rules, and any other applicable law or professional standard.
            </li>
            <li>
              We do not guarantee that AI Content will be error-free, original, or free from
              third-party claims.
            </li>
            <li>
              Subject to these Terms and applicable law, you own the content you generate using
              the Service and provide to us for publishing on your behalf.
            </li>
          </ul>
        </Section>

        <Section title="5. Social Media Publishing">
          <p className="mt-3 text-ink">
            When you connect a social media account (Facebook, Instagram, LinkedIn, X/Twitter)
            to Marquee, you authorise us to publish content to that account on your behalf using
            the OAuth permissions you grant. You agree that:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink">
            <li>
              You have the right and authority to publish to the connected accounts and pages.
            </li>
            <li>
              You remain solely responsible for all content published to your social media
              accounts via Marquee, including any content published by automated scheduling.
            </li>
            <li>
              You will comply with the terms of service of each social media platform to which
              you publish.
            </li>
            <li>
              You can revoke Marquee&apos;s access to any connected account at any time from your
              Profile → Connections page or via the relevant platform&apos;s settings.
            </li>
          </ul>
        </Section>

        <Section title="6. Subscription, Billing, and Refunds">
          <p className="mt-3 text-ink">
            Access to paid features requires a paid subscription. Billing is handled by Stripe.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-ink">
            <li>
              <strong>Free trial:</strong> New accounts receive a 14-day free trial of Solo-tier
              features. No credit card is required to start a trial. At the end of the trial,
              your account reverts to the Free plan unless you subscribe.
            </li>
            <li>
              <strong>Paid plans:</strong> Subscriptions are billed monthly in advance. Your
              subscription renews automatically at the end of each billing period unless
              cancelled.
            </li>
            <li>
              <strong>Cancellation:</strong> You may cancel your subscription at any time
              through the billing portal (Company → Subscription → Manage billing). Cancellation
              takes effect at the end of the current paid period — you retain access until then.
            </li>
            <li>
              <strong>Refunds:</strong> Subscription fees are generally non-refundable except
              where required by law. If you believe you were charged in error, contact us within
              14 days at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-deep underline">
                {CONTACT_EMAIL}
              </a>
              .
            </li>
            <li>
              <strong>Plan changes:</strong> Upgrades take effect immediately. Downgrades take
              effect at the start of the next billing period.
            </li>
            <li>
              <strong>AI credits:</strong> Unused AI credits do not roll over to the next month
              and have no cash value.
            </li>
            <li>
              We reserve the right to change pricing with 30 days&apos; notice to your registered
              email address. Continued use after a price change constitutes acceptance of the new
              pricing.
            </li>
          </ul>
        </Section>

        <Section title="7. Intellectual Property">
          <p className="mt-3 text-ink">
            <strong>Our IP:</strong> Marquee and its underlying technology, design, trademarks,
            and software are owned by us or our licensors and are protected by intellectual
            property laws. These Terms do not transfer any ownership of our IP to you.
          </p>
          <p className="mt-3 text-ink">
            <strong>Your content:</strong> You retain ownership of the content and data you
            upload to Marquee (photos, listing details, brand assets). By uploading content you
            grant us a limited, non-exclusive, royalty-free licence to store, process, and
            display that content solely to operate and provide the Service to you.
          </p>
          <p className="mt-3 text-ink">
            <strong>Feedback:</strong> If you submit feedback, feature requests, or suggestions,
            you grant us a perpetual, royalty-free right to use that feedback to improve the
            Service without any obligation to you.
          </p>
        </Section>

        <Section title="8. Data and Privacy">
          <p className="mt-3 text-ink">
            Your use of the Service is also governed by our{" "}
            <Link href="/privacy" className="text-gold-deep underline">
              Privacy Policy
            </Link>
            , which is incorporated into these Terms by reference. By using the Service you
            consent to our collection and use of data as described therein.
          </p>
        </Section>

        <Section title="9. Third-Party Services">
          <p className="mt-3 text-ink">
            The Service integrates with third-party platforms including Meta (Facebook /
            Instagram), LinkedIn, X Corp, Stripe, Supabase, Anthropic, and others. Your use of
            those services is governed by their respective terms of service and privacy policies.
            We are not responsible for the availability, accuracy, or practices of any
            third-party service.
          </p>
        </Section>

        <Section title="10. Disclaimers">
          <p className="mt-3 text-ink">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR THAT THE SERVICE WILL BE
            UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS. WE DO NOT WARRANT THAT
            AI-GENERATED CONTENT WILL BE ACCURATE, COMPLETE, OR SUITABLE FOR ANY PARTICULAR USE.
          </p>
          <p className="mt-3 text-ink">
            You use the Service at your own risk. We are not a licensed real estate broker,
            attorney, or financial adviser, and nothing in the Service constitutes legal,
            financial, or professional advice.
          </p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p className="mt-3 text-ink">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL MARQUEE, ITS
            OFFICERS, DIRECTORS, EMPLOYEES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA,
            GOODWILL, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE
            OF THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p className="mt-3 text-ink">
            OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ANY CLAIMS ARISING OUT OF OR RELATED TO
            THESE TERMS OR THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE TOTAL FEES YOU
            PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED US DOLLARS
            ($100).
          </p>
          <p className="mt-3 text-ink">
            Some jurisdictions do not allow certain limitations of liability. In such
            jurisdictions our liability is limited to the greatest extent permitted by law.
          </p>
        </Section>

        <Section title="12. Indemnification">
          <p className="mt-3 text-ink">
            You agree to indemnify, defend, and hold harmless Marquee and its officers,
            directors, employees, and agents from any claims, damages, losses, liabilities,
            costs, and expenses (including reasonable legal fees) arising out of or related to:
            (a) your use of the Service; (b) content you generate, publish, or distribute using
            the Service; (c) your violation of these Terms; or (d) your violation of any
            third-party rights or applicable law.
          </p>
        </Section>

        <Section title="13. Termination">
          <p className="mt-3 text-ink">
            <strong>By you:</strong> You may close your account at any time by contacting us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-deep underline">
              {CONTACT_EMAIL}
            </a>
            . Closing your account terminates your subscription at the end of the current paid
            period.
          </p>
          <p className="mt-3 text-ink">
            <strong>By us:</strong> We may suspend or terminate your account immediately and
            without notice if you violate these Terms, engage in fraudulent or abusive conduct,
            or if we reasonably believe your use poses a risk to the Service or to other users.
            We may also terminate the Service entirely with 30 days&apos; notice.
          </p>
          <p className="mt-3 text-ink">
            Upon termination, your right to access the Service ceases immediately. Sections
            4, 7, 10, 11, 12, and 15 survive termination.
          </p>
        </Section>

        <Section title="14. Changes to These Terms">
          <p className="mt-3 text-ink">
            We may update these Terms from time to time. We will notify you of material changes
            by email or by posting a notice in the app at least 14 days before the changes take
            effect. Your continued use of the Service after the effective date constitutes
            acceptance of the updated Terms. If you do not agree to the updated Terms, you must
            stop using the Service before the effective date.
          </p>
        </Section>

        <Section title="15. Governing Law and Disputes">
          <p className="mt-3 text-ink">
            These Terms are governed by and construed in accordance with the laws of the State
            of New Jersey, United States, without regard to its conflict-of-law provisions. Any
            dispute arising out of or relating to these Terms or the Service will be resolved
            exclusively in the state or federal courts located in Monmouth County, New Jersey,
            and you consent to the personal jurisdiction of those courts.
          </p>
          <p className="mt-3 text-ink">
            Before filing any legal claim, you agree to contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold-deep underline">
              {CONTACT_EMAIL}
            </a>{" "}
            and attempt to resolve the dispute informally for at least 30 days.
          </p>
        </Section>

        <Section title="16. Contact Us">
          <p className="mt-3 text-ink">
            Questions about these Terms? Contact us:
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
            <Link href="/privacy" className="hover:text-ink hover:underline">
              Privacy Policy
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
