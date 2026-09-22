"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck, BarChart3, CalendarDays, Flag, FolderOpen, LayoutDashboard, LifeBuoy,
  MessageSquare, ScrollText, Scissors, Users,
} from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/artists", label: "Artists", icon: Scissors },
  { href: "/admin/verifications", label: "Verifications", icon: BadgeCheck },
  { href: "/admin/moderation", label: "Portfolio & reviews", icon: FolderOpen },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/tickets", label: "Support tickets", icon: LifeBuoy },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex flex-1 gap-8 py-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 rounded-2xl border bg-card p-3 shadow-sm">
            <p className="flex items-center gap-2 px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <LayoutDashboard className="h-3.5 w-3.5" /> Admin console
            </p>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                    (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href))
                      ? "bg-accent text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-thin lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium",
                  (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href))
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
