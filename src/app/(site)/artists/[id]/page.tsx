import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BadgeCheck, CalendarPlus, GraduationCap, MapPin, MessageCircle, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { RatingStars, OnlineStatusBadge, EmptyState } from "@/components/shared";
import { ArtistActions } from "./artist-actions";
import { PortfolioGallery } from "./portfolio-gallery";
import { ReviewsSection } from "./reviews-section";
import { SevikaMap } from "@/components/map";
import { categoryEmoji, categoryLabel, BRAND } from "@/lib/constants";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const artist = await db.artistProfile.findUnique({
    where: { id: params.id },
    select: { displayName: true, tagline: true },
  }).catch(() => null);
  return { title: artist ? `${artist.displayName} — ${artist.tagline ?? "Beauty professional"}` : "Artist" };
}

export default async function ArtistProfilePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  const artist = await db.artistProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, suspended: true, name: true, avatarUrl: true, createdAt: true } },
      services: { where: { isActive: true }, orderBy: { priceFrom: "asc" } },
      portfolio: { where: { moderationStatus: { not: "REJECTED" } }, orderBy: { createdAt: "desc" } },
      certificates: { where: { status: "VERIFIED" }, select: { id: true, title: true, issuer: true } },
    },
  }).catch(() => null);

  if (!artist || artist.user.suspended) notFound();

  const favorited = session?.user?.id
    ? Boolean(
        await db.favorite.findUnique({
          where: { userId_artistId: { userId: session.user.id, artistId: artist.id } },
        })
      )
    : false;

  const reviews = await db.review.findMany({
    where: { artistId: artist.id, hidden: false },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { customer: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return (
    <div className="container max-w-6xl py-8">
      {/* Cover ---------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="h-44 brand-gradient opacity-90 sm:h-56">
          {artist.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artist.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                {artist.user.avatarUrl ? <AvatarImage src={artist.user.avatarUrl} alt={artist.displayName} /> : null}
                <AvatarFallback className="text-2xl">{initials(artist.displayName)}</AvatarFallback>
              </Avatar>
              <div className="pb-1">
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                  {artist.displayName}
                  {artist.verificationStatus === "VERIFIED" && (
                    <span title="Verified by Sevika"><BadgeCheck className="h-6 w-6 text-primary" /></span>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">{artist.tagline || "Beauty professional"}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <OnlineStatusBadge status={artist.onlineStatus} />
                  {artist.city && (
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{artist.city}</span>
                  )}
                  <RatingStars rating={artist.ratingAvg} count={artist.ratingCount} />
                </div>
              </div>
            </div>
            <ArtistActions
              artistId={artist.id}
              artistName={artist.displayName}
              favorited={favorited}
              isOwner={session?.user?.id === artist.userId}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Main column ---------------------------------------------------- */}
        <div>
          <Tabs defaultValue="about">
            <TabsList className="flex-wrap">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="services">Services ({artist.services.length})</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio ({artist.portfolio.length})</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({artist.ratingCount})</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="space-y-5">
              {artist.bio ? (
                <Card>
                  <CardContent className="p-6">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{artist.bio}</p>
                  </CardContent>
                </Card>
              ) : (
                <EmptyState icon={<Scissors />} title="No bio yet" description="This artist hasn't written a bio yet." />
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Experience", value: `${artist.yearsExperience}+ years` },
                  { label: "Jobs completed", value: String(artist.completedJobs) },
                  { label: "Languages", value: artist.languages.length ? artist.languages.join(", ") : "—" },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="p-4 text-center">
                      <p className="text-lg font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {artist.categories.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <p className="mb-3 text-sm font-semibold">Specialties</p>
                    <div className="flex flex-wrap gap-2">
                      {artist.categories.map((c) => (
                        <Badge key={c} variant="secondary" className="rounded-lg px-3 py-1">
                          {categoryEmoji(c)} {categoryLabel(c)}
                        </Badge>
                      ))}
                      {artist.specialties.map((s) => (
                        <Badge key={s} variant="outline" className="rounded-lg px-3 py-1">{s}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {reviews.length > 0 && <ReviewsSection artistId={artist.id} initialReviews={reviews} />}
            </TabsContent>

            <TabsContent value="services" className="space-y-3">
              {artist.services.length === 0 ? (
                <EmptyState title="No services listed yet" description="Check back soon — this artist is setting up their catalogue." />
              ) : (
                artist.services.map((s) => (
                  <Card key={s.id} className="group">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                      <div className="min-w-0">
                        <p className="font-semibold">{s.name}</p>
                        {s.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {categoryEmoji(s.category)} {categoryLabel(s.category)} · ~{s.durationMin} min
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-right text-sm">
                          <span className="block text-xs text-muted-foreground">from</span>
                          <span className="text-base font-bold">₹{s.priceFrom.toLocaleString("en-IN")}</span>
                        </p>
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/book/${artist.id}?service=${s.id}`}>
                            <CalendarPlus /> Book
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="portfolio">
              <PortfolioGallery items={artist.portfolio} />
            </TabsContent>

            <TabsContent value="reviews">
              {reviews.length === 0 ? (
                <EmptyState title="No reviews yet" description="Completed bookings can be reviewed by customers." />
              ) : (
                <ReviewsSection artistId={artist.id} initialReviews={reviews} />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar --------------------------------------------------------- */}
        <aside className="space-y-5">
          <Card>
            <CardContent className="p-6">
              <p className="mb-3 text-sm font-semibold">Book {artist.displayName.split(" ")[0]}</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Free to request · no booking fee. {BRAND.paymentNote}
              </p>
              <Button asChild className="w-full">
                <Link href={`/book/${artist.id}`}><CalendarPlus /> Request a booking</Link>
              </Button>
              {session?.user?.role === "CUSTOMER" && (
                <Button asChild variant="outline" className="mt-2 w-full">
                  <Link href={`/messages?to=${artist.id}`}><MessageCircle /> Message</Link>
                </Button>
              )}
              {!session && (
                <Button asChild variant="outline" className="mt-2 w-full">
                  <Link href={`/login?callbackUrl=/artists/${artist.id}`}><MessageCircle /> Sign in to chat</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {artist.certificates.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <GraduationCap className="h-4 w-4 text-primary" /> Verified certificates
                </p>
                <ul className="space-y-2">
                  {artist.certificates.map((c) => (
                    <li key={c.id} className="flex items-start gap-2 text-sm">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>
                        {c.title}
                        {c.issuer && <span className="block text-xs text-muted-foreground">{c.issuer}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {(artist.lat != null && artist.lng != null) || artist.serviceArea ? (
            <Card>
              <CardContent className="space-y-3 p-6">
                <p className="text-sm font-semibold">Service area</p>
                {artist.serviceArea && <p className="text-sm text-muted-foreground">{artist.serviceArea}</p>}
                {artist.lat != null && artist.lng != null && (
                  <SevikaMap
                    className="h-44"
                    zoom={13}
                    points={[{ id: "artist", lat: artist.lat, lng: artist.lng, label: artist.displayName }]}
                  />
                )}
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
