import { BRAND } from "@/lib/constants";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <article className="container max-w-2xl py-12">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated: September 2026</p>
      <div className="prose-neutral mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-2">
        <section>
          <h2>1. About Sevika</h2>
          <p>
            {BRAND.name} is a free marketplace that connects customers with independent beauty and
            grooming professionals. {BRAND.name} charges no customers, no artists, no booking fees
            and no platform fees. The platform earns nothing from bookings.
          </p>
        </section>
        <section>
          <h2>2. No payments through Sevika</h2>
          <p>
            {BRAND.name} does not process payments, hold money, or operate escrow or payouts.
            {BRAND.paymentNote} Any dispute about payment is strictly between the customer and the
            professional.
          </p>
        </section>
        <section>
          <h2>3. Accounts</h2>
          <p>
            You must provide accurate information when registering. Artists are independent
            professionals and are not employees of {BRAND.name}. We may suspend accounts that
            violate these terms, spam the platform, or behave unsafely.
          </p>
        </section>
        <section>
          <h2>4. Bookings</h2>
          <p>
            Booking requests are free to create. A booking is confirmed only when the professional
            accepts it. Either party may cancel or propose a reschedule through the platform, and
            the other party is notified.
          </p>
        </section>
        <section>
          <h2>5. Reviews & content</h2>
          <p>
            Reviews may only be posted for completed bookings and must be honest and lawful. We
            moderate portfolios, reviews and reports and may remove content that violates our
            policies.
          </p>
        </section>
        <section>
          <h2>6. Verification</h2>
          <p>
            The &quot;Verified by Sevika&quot; badge indicates that the professional&apos;s
            submitted certificates were reviewed by our team. It is not a guarantee of quality, and
            customers should use their own judgement.
          </p>
        </section>
        <section>
          <h2>7. Contact</h2>
          <p>Questions about these terms? Reach us at {BRAND.supportEmail} or via in-app support.</p>
        </section>
      </div>
    </article>
  );
}
