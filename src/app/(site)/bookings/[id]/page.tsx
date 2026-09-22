"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, CalendarClock, CalendarDays, Clock, MapPin, MessageCircle,
  Phone, Star, User,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BookingStatusBadge, EmptyState, RatingStars } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { BRAND } from "@/lib/constants";
import { cn, durationLabel, formatBookingTime, formatDay, initials, timeAgo } from "@/lib/utils";

interface BookingDetail {
  booking: {
    id: string;
    code: string;
    status: string;
    type: string;
    scheduledAt: string;
    durationMin: number;
    locationType: string | null;
    addressLine: string | null;
    city: string | null;
    pincode: string | null;
    notes: string | null;
    groupName: string | null;
    headcount: number | null;
    contactPhone: string | null;
    proposedAt: string | null;
    rescheduleRequestedBy: string | null;
    cancelReason: string | null;
    createdAt: string;
    services: Array<{ id: string; name: string; priceAtBooking: number; durationMin: number }>;
    statusHistory: Array<{ id: string; type: string; message: string | null; createdAt: string }>;
    customer: { id: string; name: string; email: string; avatarUrl: string | null; phone: string | null };
    artist: {
      id: string;
      displayName: string;
      serviceArea: string | null;
      user: { id: string; name: string; email: string; avatarUrl: string | null };
    };
    review: { id: string; rating: number; comment: string | null; artistReply: string | null } | null;
  };
  viewer: "CUSTOMER" | "ARTIST" | "ADMIN";
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data, isLoading, error } = useQuery<BookingDetail>({
    queryKey: ["booking", id],
    queryFn: () => api(`/api/bookings/${id}`),
    refetchInterval: 10_000,
  });

  const action = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api(`/api/bookings/${id}`, { method: "PATCH", json: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      setCancelOpen(false);
      setCancelReason("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewMutation = useMutation({
    mutationFn: () => api("/api/reviews", { method: "POST", json: { bookingId: id, rating, comment } }),
    onSuccess: () => {
      toast.success("Thanks for sharing! ⭐");
      setReviewOpen(false);
      qc.invalidateQueries({ queryKey: ["booking", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const when = data?.booking;
  const isCustomer = data?.viewer === "CUSTOMER";
  const isArtist = data?.viewer === "ARTIST";
  const counterpart = isArtist
    ? { name: when?.customer.name, avatar: when?.customer.avatarUrl, sub: when?.customer.email }
    : { name: when?.artist.displayName, avatar: when?.artist.user.avatarUrl, sub: when?.artist.serviceArea };

  const rescheduleSlotsQuery = useQuery<{ slots: string[] }>({
    queryKey: ["slots-reschedule", data?.booking.artist.id, data?.booking.scheduledAt.slice(0, 10), data?.booking.durationMin],
    queryFn: () =>
      api(
        `/api/availability/slots?artistId=${data!.booking.artist.id}&date=${data!.booking.scheduledAt.slice(0, 10)}&durationMin=${data!.booking.durationMin}`
      ),
    enabled: rescheduleOpen && Boolean(data?.booking.artist.id),
  });

  if (isLoading) {
    return (
      <div className="container max-w-3xl py-8 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (error || !data || !when) {
    return (
      <div className="container py-8">
        <EmptyState
          title="Booking not found"
          description="It may belong to another account."
          action={<Button asChild variant="outline"><Link href="/bookings">Back to bookings</Link></Button>}
        />
      </div>
    );
  }

  const canCancel = ["PENDING", "CONFIRMED", "RESCHEDULE_REQUESTED"].includes(when.status);
  const showReview = isCustomer && when.status === "COMPLETED" && !when.review;

  return (
    <div className="container max-w-3xl py-8">
      <PageHeader
        title={when.type === "GROUP_EVENT" ? when.groupName || "Group booking" : "Booking"}
        description={`Ref ${when.code.slice(-6).toUpperCase()} · requested ${timeAgo(when.createdAt)}`}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm"><Link href="/bookings"><ArrowLeft /> All bookings</Link></Button>
          </div>
        }
      />

      <div className="space-y-5">
        {/* Status --------------------------------------------------------- */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border">
                  {counterpart.avatar ? <AvatarImage src={counterpart.avatar} alt="" /> : null}
                  <AvatarFallback className="text-lg">{initials(counterpart.name ?? "S")}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{counterpart.name}</p>
                  <p className="text-xs text-muted-foreground">{counterpart.sub ?? isArtist ? "Customer" : "Professional"}</p>
                </div>
              </div>
              <BookingStatusBadge status={when.status} />
            </div>

            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{formatDay(when.scheduledAt)}</p>
                  <p className="text-xs text-muted-foreground">{formatBookingTime(when.scheduledAt)} · ~{durationLabel(when.durationMin)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">
                    {when.locationType === "STUDIO" ? "At the studio" : when.locationType === "VENUE" ? "Event venue" : "Home visit"}
                  </p>
                  {when.locationType !== "STUDIO" && (
                    <p className="text-xs text-muted-foreground">{when.addressLine}, {when.city} {when.pincode}</p>
                  )}
                </div>
              </div>
              {(when.contactPhone || when.customer.phone) && (
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 text-primary" />
                  <p className="font-medium">{when.contactPhone ?? when.customer.phone}</p>
                </div>
              )}
            </div>

            {when.rescheduleRequestedBy && when.proposedAt && when.status === "RESCHEDULE_REQUESTED" && (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm dark:border-sky-500/20 dark:bg-sky-500/10">
                <p className="font-medium text-sky-800 dark:text-sky-300">
                  <CalendarClock className="mr-1 inline h-4 w-4" />
                  {when.rescheduleRequestedBy === (isCustomer ? "CUSTOMER" : "ARTIST") ? "You" : "They"} proposed{" "}
                  {formatBookingTime(when.proposedAt, { withDate: true })}
                </p>
                {((isCustomer && when.rescheduleRequestedBy === "ARTIST") || (isArtist && when.rescheduleRequestedBy === "CUSTOMER")) && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" disabled={action.isPending} onClick={() => action.mutate({ action: "ACCEPT_RESCHEDULE" })}>
                      Accept new time
                    </Button>
                    <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => action.mutate({ action: "DECLINE_RESCHEDULE" })}>
                      Keep original
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Actions ------------------------------------------------------ */}
            <div className="mt-5 flex flex-wrap gap-2 border-t pt-5">
              {isArtist && when.status === "PENDING" && (
                <>
                  <Button disabled={action.isPending} onClick={() => action.mutate({ action: "CONFIRM" })}>Confirm booking</Button>
                  <Button variant="outline" disabled={action.isPending} onClick={() => action.mutate({ action: "DECLINE", reason: "Unavailable" })}>
                    Decline
                  </Button>
                </>
              )}
              {isArtist && when.status === "CONFIRMED" && (
                <Button variant="secondary" disabled={action.isPending} onClick={() => action.mutate({ action: "START" })}>
                  Start service
                </Button>
              )}
              {isArtist && when.status === "IN_PROGRESS" && (
                <Button disabled={action.isPending} onClick={() => action.mutate({ action: "COMPLETE" })}>
                  Mark completed
                </Button>
              )}
              {isCustomer && when.artist.id && when.status === "PENDING" && (
                <Button asChild variant="outline">
                  <Link href={`/messages?to=${when.artist.id}`}><MessageCircle /> Message artist</Link>
                </Button>
              )}
              {isCustomer && ["CONFIRMED", "RESCHEDULE_REQUESTED"].includes(when.status) && (
                <Button asChild variant="outline">
                  <Link href={`/messages?to=${when.artist.id}`}><MessageCircle /> Message</Link>
                </Button>
              )}
              {canCancel && (
                <>
                  <Button variant="outline" onClick={() => setRescheduleOpen(true)}>
                    <CalendarClock /> Propose new time
                  </Button>
                  <Button variant="destructive" onClick={() => setCancelOpen(true)}>Cancel booking</Button>
                </>
              )}
              {showReview && (
                <Button onClick={() => setReviewOpen(true)}>
                  <Star /> Write a review
                </Button>
              )}
            </div>

            {when.review && (
              <div className="mt-4 rounded-xl bg-secondary/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Your review</p>
                  <RatingStars rating={when.review.rating} />
                </div>
                {when.review.comment && <p className="mt-1 text-sm text-muted-foreground">{when.review.comment}</p>}
                {when.review.artistReply && (
                  <p className="mt-2 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
                    Artist replied: {when.review.artistReply}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services & notes ------------------------------------------------ */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <p className="mb-3 text-sm font-semibold">Services</p>
              <ul className="space-y-2">
                {when.services.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" />{s.name}</span>
                    <span className="text-xs text-muted-foreground">from ₹{s.priceAtBooking.toLocaleString("en-IN")} · {durationLabel(s.durationMin)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">{BRAND.paymentNote}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="mb-3 text-sm font-semibold">Notes & history</p>
              {when.notes && <p className="mb-3 text-sm text-muted-foreground">“{when.notes}”</p>}
              <ul className="space-y-2 text-xs">
                {[...when.statusHistory].reverse().map((h) => (
                  <li key={h.id} className="flex items-center gap-2 text-muted-foreground">
                    <span className={cn("h-1.5 w-1.5 rounded-full", h.type.includes("CANCEL") || h.type === "DECLINED" ? "bg-rose-400" : "bg-emerald-400")} />
                    {h.type.replaceAll("_", " ").toLowerCase()} · {timeAgo(h.createdAt)}{h.message ? ` — ${h.message}` : ""}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel dialog ------------------------------------------------------ */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>The other party will be notified immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Textarea placeholder="e.g. Change of plans…" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep booking</Button>
            <Button variant="destructive" disabled={action.isPending} onClick={() => action.mutate({ action: "CANCEL", reason: cancelReason })}>
              Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog ---------------------------------------------------- */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Propose a new time</DialogTitle>
            <DialogDescription>
              Live availability for {formatDay(when.scheduledAt)} — pick any free slot.
            </DialogDescription>
          </DialogHeader>
          {rescheduleSlotsQuery.isLoading ? (
            <Skeleton className="h-24" />
          ) : (rescheduleSlotsQuery.data?.slots.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No other free slots on this day. Try cancelling and rebooking.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {rescheduleSlotsQuery.data!.slots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setRescheduleSlot(slot)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                    rescheduleSlot === slot ? "border-transparent brand-gradient text-white" : "hover:border-primary/40"
                  )}
                >
                  {formatBookingTime(slot)}
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRescheduleOpen(false)}>Never mind</Button>
            <Button
              disabled={!rescheduleSlot || action.isPending}
              onClick={() => action.mutate({ action: "PROPOSE_RESCHEDULE", proposedAt: rescheduleSlot })}
            >
              Send proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review dialog --------------------------------------------------------- */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate your experience</DialogTitle>
            <DialogDescription>Reviews keep Sevika trustworthy for everyone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} star`}>
                <Star
                  className={cn("h-9 w-9 transition-transform hover:scale-110", n <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-600")}
                />
              </button>
            ))}
          </div>
          <Textarea placeholder="How did it go? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>Later</Button>
            <Button disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate()}>Publish review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
