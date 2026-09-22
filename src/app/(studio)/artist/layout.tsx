"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CalendarDays, Clock, FolderOpen, GraduationCap, LayoutDashboard, Scissors, Settings, UserRound,
} from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/artist", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/artist/services", label: "Services", icon: Scissors },
  { href: "/artist/availability", label: "Availability", icon: Clock },
  { href: "/artist/portfolio", label: "Portfolio", icon: FolderOpen },
  { href: "/artist/certificates", label: "Certificates", icon: GraduationCap },
  { href: "/artist/profile", label: "My profile", icon: UserRound },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

export default function ArtistLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex flex-1 gap-8 py-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 rounded-2xl border bg-card p-3 shadow-sm">
            <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Artist studio
            </p>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                    (item.href === "/artist" ? pathname === "/artist" : pathname.startsWith(item.href))
                      ? "bg-accent text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            {session?.user?.artistProfileId && (
              <Link
                href={`/artists/${session.user.artistProfileId}`}
                className="mt-3 block rounded-xl border border-dashed px-3 py-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                View public profile →
              </Link>
            )}
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          {/* Mobile nav */}
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-thin lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium",
                  (item.href === "/artist" ? pathname === "/artist" : pathname.startsWith(item.href))
                    ? "brand-gradient border-transparent text-white"
                    : "bg-card text-muted-foreground"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
