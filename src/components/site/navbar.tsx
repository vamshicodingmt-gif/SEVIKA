"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Menu, MessageSquareHeart, Bell, CalendarDays, Heart, LogOut, Settings, UserRound, ShieldCheck, Scissors } from "lucide-react";
import { Brand } from "@/components/site/brand";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/site/notification-bell";
import { cn, initials } from "@/lib/utils";

const links = [
  { href: "/discover", label: "Discover" },
  { href: "/bookings", label: "Bookings" },
  { href: "/messages", label: "Messages" },
  { href: "/favorites", label: "Favorites" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = session?.user;

  const roleLinks =
    user?.role === "ARTIST"
      ? [{ href: "/artist", label: "Artist studio" }]
      : user?.role === "ADMIN"
        ? [{ href: "/admin", label: "Admin console" }]
        : [{ href: "/become-an-artist", label: "Become an artist" }];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  pathname.startsWith(l.href) && "bg-accent text-foreground"
                )}
              >
                {l.label}
              </Link>
            ))}
            {user && roleLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  pathname.startsWith(l.href) && "bg-accent text-foreground"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {status === "loading" ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
                    <Avatar className="h-9 w-9 border">
                      {user.image ? <AvatarImage src={user.image} alt={user.name ?? ""} /> : null}
                      <AvatarFallback>{initials(user.name ?? "S")}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                    <p className="truncate">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === "ARTIST" ? (
                    <DropdownMenuItem asChild>
                      <Link href="/artist"><Scissors />Artist studio</Link>
                    </DropdownMenuItem>
                  ) : user.role === "ADMIN" ? (
                    <DropdownMenuItem asChild>
                      <Link href="/admin"><ShieldCheck />Admin console</Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link href="/account"><UserRound />My account</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/bookings"><CalendarDays />Bookings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/favorites"><Heart />Favorites</Link>
                  </DropdownMenuItem>
                  {user.role === "CUSTOMER" && (
                    <DropdownMenuItem asChild>
                      <Link href="/become-an-artist"><MessageSquareHeart />Become an artist</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account/settings"><Settings />Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      signOut({ callbackUrl: "/" });
                    }}
                  >
                    <LogOut />Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Join Sevika</Link>
              </Button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      {open && (
        <nav className="border-t bg-background px-4 py-3 md:hidden">
          {[...links, ...roleLinks].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
            >
              {l.label}
            </Link>
          ))}
          {!user && (
            <Link href="/login" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent">
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}

