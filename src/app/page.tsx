import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck, MessageCircle, Search, ShieldCheck, Sparkles, Star, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { CATEGORIES, BRAND } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArtistCard, type ArtistCardData } from "@/components/artist-card";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";

export const dynamic = "force-dynamic";

async function getFeaturedArtists(): Promise<ArtistCardData[]> {
  try {
    const profiles = await db.artistProfile.findMany({
      where: { user: { suspended: false } },
      orderBy: [{ ratingAvg: "desc" }, { completedJobs: "desc" }],
      take: 6,
      include: {
        user: { select: { avatarUrl: true } },
        services: {
          where: { isActive: true },
          select: { id: true, name: true, priceFrom: true },
          take: 5,
        },
      },
    });
    return profiles.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      tagline: p.tagline,
      city: p.city,
      avatarUrl: p.user.avatarUrl,
      coverUrl: p.coverUrl,
      verificationStatus: p.verificationStatus,
      onlineStatus: p.onlineStatus,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      completedJobs: p.completedJobs,
      yearsExperience: p.yearsExperience,
      categories: p.categories,
      services: p.services,
    }));
  } catch {
    return [];
  }
}

async function getPlatformStats() {
  try {
    const [artists, bookings] = await Promise.all([
      db.artistProfile.count({ where: { user: { suspended: false } } }),
      db.booking.count({ where: { status: "COMPLETED" } }),
    ]);
    return { artists, bookings };
  } catch {
    return { artists: 0, bookings: 0 };
  }
}

export default async function HomePage() {
  const [artists, stats] = await Promise.all([getFeaturedArtists(), getPlatformStats()]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero --------------------------------------------------------- */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-gradient-to-r from-rose-300/40 via-fuchsia-300/30 to-rose-200/40 blur-3xl dark:from-rose-500/10 dark:via-fuchsia-500/10" />
          <div className="container relative grid gap-12 py-20 lg:grid-cols-2 lg:py-28">
            <div className="flex flex-col justify-center">
              <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                0% commission · free for customers & artists
              </span>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Book trusted <span className="text-gradient">beauty & grooming</span> professionals near you
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Sevika connects you with verified makeup artists, hairstylists, groomers and wellness
                therapists. Browse portfolios, chat instantly, and book in minutes — at home or in studio.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/discover">
                    <Search /> Find professionals
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/become-an-artist">
                    Join as an artist <ArrowRight />
                  </Link>
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Verified certificates</span>
                <span className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" />Direct chat with artists</span>
                <span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" />No booking fees, ever</span>
              </div>
            </div>
            <div className="relative hidden items-center justify-center lg:flex">
              <div className="grid w-full max-w-md grid-cols-2 gap-4">
                {[
                  { icon: "💄", title: "Bridal makeup", sub: "by artists near you" },
                  { icon: "💇", title: "Hair styling", sub: "at home or studio" },
                  { icon: "💅", title: "Nail artistry", sub: "top rated pros" },
                  { icon: "✂️", title: "Men's grooming", sub: "expert barbers" },
                ].map((t, i) => (
                  <Card
                    key={t.title}
                    className="animate-fade-up"
                    // stagger
                  >
                    <CardContent className="p-5" style={{ animationDelay: `${i * 90}ms` }}>
                      <span className="text-2xl">{t.icon}</span>
                      <p className="mt-2 text-sm font-semibold">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Categories --------------------------------------------------- */}
        <section className="container py-14">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Browse by category</h2>
              <p className="mt-1 text-sm text-muted-foreground">Everything from bridal glam to beard sculpting</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/discover">View all <ArrowRight /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/discover?category=${c.slug}`}
                className="group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="text-3xl">{c.emoji}</span>
                <p className="mt-3 text-sm font-semibold group-hover:text-primary">{c.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.blurb}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured artists --------------------------------------------- */}
        {artists.length > 0 && (
          <section className="bg-secondary/40 py-14 dark:bg-secondary/20">
            <div className="container">
              <div className="mb-8 flex items-end justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Top-rated professionals</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stats.artists.toLocaleString("en-IN")} artists · {stats.bookings.toLocaleString("en-IN")} bookings completed on Sevika
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/discover">Discover all <ArrowRight /></Link>
                </Button>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {artists.map((a) => (
                  <ArtistCard key={a.id} artist={a} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* How it works -------------------------------------------------- */}
        <section className="container py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">How Sevika works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              { icon: Search, title: "1 · Discover", text: "Search artists by city, service and budget. Compare portfolios, ratings and certificates." },
              { icon: MessageCircle, title: "2 · Chat", text: "Message artists directly to plan your look, group events or home visits." },
              { icon: CalendarCheck, title: "3 · Book free", text: "Pick a slot from the artist's live calendar. Bookings are always free to request." },
              { icon: Star, title: "4 · Enjoy & review", text: "Pay the artist directly — Sevika charges nothing. Share a review to help others." },
            ].map((s) => (
              <Card key={s.title}>
                <CardContent className="p-6">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Zero commission ------------------------------------------------ */}
        <section className="container pb-20">
          <div className="relative overflow-hidden rounded-3xl brand-gradient px-8 py-14 text-center text-white shadow-lg">
            <BadgeCheck className="mx-auto h-10 w-10 opacity-90" />
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight">
              {BRAND.name} is completely free. Zero commission. Zero booking fees.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/85">
              Artists keep 100% of what they earn. {BRAND.paymentNote}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary" className="bg-white text-rose-600 hover:bg-white/90">
                <Link href="/register">Create your free account</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/become-an-artist">I&apos;m an artist</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
