import Link from "next/link";
import { Brand } from "@/components/site/brand";
import { BRAND } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container grid gap-10 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Brand />
          <p className="max-w-xs text-sm text-muted-foreground">
            {BRAND.tagline}. A free marketplace with <strong>0% commission</strong> — Sevika never
            charges customers or artists, and never processes payments.
          </p>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Explore</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/discover">Discover artists</Link></li>
            <li><Link className="hover:text-foreground" href="/become-an-artist">Become an artist</Link></li>
            <li><Link className="hover:text-foreground" href="/support">Support</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Account</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/login">Sign in</Link></li>
            <li><Link className="hover:text-foreground" href="/register">Create account</Link></li>
            <li><Link className="hover:text-foreground" href="/bookings">My bookings</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Legal</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/legal/terms">Terms of service</Link></li>
            <li><Link className="hover:text-foreground" href="/legal/privacy">Privacy policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-5">
        <p className="container text-xs text-muted-foreground">
          © {new Date().getFullYear()} {BRAND.name}. {BRAND.paymentNote}
        </p>
      </div>
    </footer>
  );
}
