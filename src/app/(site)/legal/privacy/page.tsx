import { BRAND } from "@/lib/constants";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="container max-w-2xl py-12">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated: September 2026</p>
      <div className="prose-neutral mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-2">
        <section>
          <h2>What we collect</h2>
          <p>
            Account details (name, email, phone, city), your messages with other Sevika users,
            bookings you create, reviews you write, and media you upload (profile photos, portfolio
            images/videos, certificates).
          </p>
        </section>
        <section>
          <h2>What we never collect</h2>
          <p>
            {BRAND.name} has no payment system, so we never collect card numbers, bank details or
            transaction data. Payment arrangements are made directly between customers and
            professionals.
          </p>
        </section>
        <section>
          <h2>How we use data</h2>
          <p>
            To run the marketplace: showing your profile to other users, delivering bookings,
            chats, notifications and emails, verifying certificates, and keeping the platform safe
            (moderation, reports, audit logs).
          </p>
        </section>
        <section>
          <h2>Location</h2>
          <p>
            Artists may publish a service location to appear in nearby discovery. Customers may
            optionally share device location to sort artists by distance — this is never stored.
          </p>
        </section>
        <section>
          <h2>Retention & deletion</h2>
          <p>
            You can request account deletion at {BRAND.supportEmail}. We remove or anonymise your
            personal data, retaining only what law or safety requires (e.g. fraud records).
          </p>
        </section>
        <section>
          <h2>Contact</h2>
          <p>Privacy questions: {BRAND.supportEmail}.</p>
        </section>
      </div>
    </article>
  );
}
