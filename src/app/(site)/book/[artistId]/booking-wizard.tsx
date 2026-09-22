"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Building2, CalendarDays, Check, Clock, Home, Info, Loader2,
  MapPin, Scissors, Sparkles, Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/misc";
import { useBookingWizard } from "@/store/booking-wizard";
import { BRAND, ONLINE_STATUS_META } from "@/lib/constants";
import { cn, durationLabel, formatDay, formatBookingTime, initials } from "@/lib/utils";
import { api } from "@/lib/client";

interface ArtistInfo {
  id: string;
  displayName: string;
  city: string | null;
  serviceArea: string | null;
  avatarUrl: string | null;
  onlineStatus: string;
}
interface ServiceInfo {
  id: string;
  name: string;
  priceFrom: number;
  durationMin: number;
  category: string;
}

const STEPS = ["Services", "Date & time", "Location", "Review"];

function nextDays(count: number) {
  const days: string[] = [];
  const base = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + i));
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function BookingWizard({
  artist,
  services,
  preselectedServiceId,
  customer,
}: {
  artist: ArtistInfo;
  services: ServiceInfo[];
  preselectedServiceId: string | null;
  customer: { name: string; phone: string | null; city: string | null } | null;
}) {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const wiz = useBookingWizard();
  const [submitting, setSubmitting] = useState(false);
  const [slotsTouched, setSlotsTouched] = useState(false);

  // Bootstrap wizard once.
  useEffect(() => {
    wiz.reset();
    if (preselectedServiceId) {
      useBookingWizard.setState({ serviceIds: [preselectedServiceId] });
    } else if (services.length > 0) {
      useBookingWizard.setState({ serviceIds: [services[0].id] });
    }
    if (customer) {
      useBookingWizard.setState({ city: customer.city ?? "", contactPhone: customer.phone ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => services.filter((s) => wiz.serviceIds.includes(s.id)),
    [services, wiz.serviceIds]
  );
  const totalDuration = selected.reduce((sum, s) => sum + s.durationMin, 0);
  const fromPrice = selected.reduce((sum, s) => sum + s.priceFrom, 0);
  const days = useMemo(() => nextDays(14), []);

  const duration = totalDuration || 60;

  const slotsQuery = useQuery<{ slots: string[]; closed: boolean }>({
    queryKey: ["slots", artist.id, wiz.date, duration],
    queryFn: () => api(`/api/availability/slots?artistId=${artist.id}&date=${wiz.date}&durationMin=${duration}`),
    enabled: Boolean(wiz.date) && wiz.step === 1,
  });

  useEffect(() => {
    if (slotsQuery.data) setSlotsTouched(true);
  }, [slotsQuery.data]);

  const canNext = [
    wiz.serviceIds.length > 0,
    Boolean(wiz.slot),
    wiz.locationType === "STUDIO" || (wiz.addressLine.trim().length > 0 && wiz.city.trim().length > 0),
    true,
  ][wiz.step];

  async function submit() {
    if (sessionStatus !== "authenticated") {
      router.push(`/login?callbackUrl=/book/${artist.id}`);
      return;
    }
    setSubmitting(true);
    try {
      const { booking } = await api<{ booking: { id: string } }>("/api/bookings", {
        method: "POST",
        json: {
          artistId: artist.id,
          serviceIds: wiz.serviceIds,
          scheduledAt: wiz.slot,
          type: wiz.isGroup ? "GROUP_EVENT" : "INDIVIDUAL",
          locationType: wiz.locationType,
          addressLine: wiz.addressLine || undefined,
          city: wiz.city || undefined,
          pincode: wiz.pincode || undefined,
          notes: wiz.notes || undefined,
          groupName: wiz.isGroup ? wiz.groupName : undefined,
          headcount: wiz.isGroup ? Number(wiz.headcount) : undefined,
          contactPhone: wiz.contactPhone || undefined,
        },
      });
      toast.success("Booking request sent! 🌸", {
        description: `${artist.displayName} will confirm shortly. You'll get a notification.`,
      });
      wiz.reset();
      router.push(`/bookings/${booking.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setSubmitting(false);
    }
  }

  const statusMeta = ONLINE_STATUS_META[artist.onlineStatus] ?? ONLINE_STATUS_META.OFFLINE;

  return (
    <div className="container max-w-5xl py-8">
      {/* Header --------------------------------------------------------- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border">
            {artist.avatarUrl ? <AvatarImage src={artist.avatarUrl} alt={artist.displayName} /> : null}
            <AvatarFallback>{initials(artist.displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold leading-tight">{artist.displayName}</p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("inline-block h-2 w-2 rounded-full animate-pulse", statusMeta.dot)} />
              {artist.city ?? "Beauty professional"}
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-secondary px-4 py-2 text-center">
          <p className="text-xs text-muted-foreground">Estimated from</p>
          <p className="text-lg font-bold">₹{fromPrice.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {/* Steps bar ------------------------------------------------------ */}
      <ol className="mb-8 flex items-center gap-2 text-xs sm:text-sm">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <button
              onClick={() => i < wiz.step && wiz.setStep(i)}
              disabled={i > wiz.step}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                i < wiz.step && "border-transparent brand-gradient text-white",
                i === wiz.step && "border-primary text-primary",
                i > wiz.step && "text-muted-foreground"
              )}
            >
              {i < wiz.step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </button>
            <span className={cn(i === wiz.step ? "font-semibold" : "text-muted-foreground", "hidden sm:inline")}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      <motion.div key={wiz.step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
        {/* Step 1: services ---------------------------------------------- */}
        {wiz.step === 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Pick one or more services ({selected.length} selected · ~{durationLabel(totalDuration || 60)})</p>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={wiz.isGroup} onCheckedChange={(v) => wiz.patch({ isGroup: v })} />
                <Users className="h-4 w-4 text-primary" /> Group / event booking
              </label>
            </div>
            {wiz.isGroup && (
              <Card>
                <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Event name</Label>
                    <Input placeholder="e.g. Priya's bridal party" value={wiz.groupName} onChange={(e) => wiz.patch({ groupName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>How many people?</Label>
                    <Input type="number" min={2} max={500} placeholder="e.g. 6" value={wiz.headcount} onChange={(e) => wiz.patch({ headcount: e.target.value })} />
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((s) => {
                const active = wiz.serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => wiz.toggleService(s.id)}
                    className={cn(
                      "rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5",
                      active ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{s.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{durationLabel(s.durationMin)} · from ₹{s.priceFrom.toLocaleString("en-IN")}</p>
                      </div>
                      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", active ? "brand-gradient border-transparent text-white" : "text-transparent")}>
                        <Check className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: date & time -------------------------------------------- */}
        {wiz.step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium">Select a date</p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {days.map((d) => (
                  <button
                    key={d}
                    onClick={() => wiz.setDate(d)}
                    className={cn(
                      "shrink-0 rounded-xl border px-4 py-2.5 text-center text-sm transition-colors",
                      wiz.date === d ? "border-transparent brand-gradient text-white" : "bg-card hover:border-primary/40"
                    )}
                  >
                    <span className="block text-xs opacity-80">{formatDay(new Date(`${d}T00:00:00Z`)).split(" ")[0]}</span>
                    <span className="font-semibold">{d.slice(8)}</span>
                    <span className="block text-xs opacity-80">{formatDay(new Date(`${d}T00:00:00Z`)).split(" ")[2]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-primary" /> Available start times
                <span className="text-xs font-normal text-muted-foreground">(~{durationLabel(duration)} needed)</span>
              </p>
              {!wiz.date ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Pick a date to see available slots</p>
              ) : slotsQuery.isLoading ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : slotsQuery.data?.closed ? (
                <div className="flex items-center gap-2 rounded-xl border border-dashed bg-secondary/40 p-5 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" /> This artist hasn&apos;t published working hours yet — message them to arrange a time.
                </div>
              ) : (slotsQuery.data?.slots.length ?? 0) === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-dashed bg-secondary/40 p-5 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" /> Fully booked on this day — try another date.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {slotsQuery.data!.slots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => wiz.setSlot(slot)}
                      className={cn(
                        "rounded-xl border px-2 py-2.5 text-center text-sm font-medium transition-colors",
                        wiz.slot === slot ? "border-transparent brand-gradient text-white" : "bg-card hover:border-primary/40"
                      )}
                    >
                      {formatBookingTime(slot)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {wiz.slot && (
              <p className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">
                <Sparkles className="mr-1 inline h-4 w-4 text-primary" />
                Selected: <strong>{formatBookingTime(wiz.slot, { withDate: true })}</strong> (artist&apos;s local time)
              </p>
            )}
          </div>
        )}

        {/* Step 3: location & notes ----------------------------------------- */}
        {wiz.step === 2 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { value: "HOME", icon: Home, label: "At my home", hint: "Artist travels to you" },
                { value: "STUDIO", icon: Building2, label: `At ${artist.displayName.split(" ")[0]}'s studio`, hint: artist.serviceArea || artist.city || "Visit the studio" },
                { value: "VENUE", icon: MapPin, label: "Event venue", hint: "Weddings, parties & shoots" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => wiz.patch({ locationType: opt.value as "HOME" | "STUDIO" | "VENUE" })}
                  className={cn(
                    "rounded-2xl border bg-card p-4 text-left transition-all",
                    wiz.locationType === opt.value ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40"
                  )}
                >
                  <opt.icon className="h-5 w-5 text-primary" />
                  <p className="mt-2 text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.hint}</p>
                </button>
              ))}
            </div>
            {wiz.locationType !== "STUDIO" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Service address *</Label>
                  <Input placeholder="Flat, street, landmark" value={wiz.addressLine} onChange={(e) => wiz.patch({ addressLine: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>City *</Label>
                  <Input placeholder={artist.city ?? "City"} value={wiz.city} onChange={(e) => wiz.patch({ city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Pincode</Label>
                  <Input placeholder="e.g. 400001" value={wiz.pincode} onChange={(e) => wiz.patch({ pincode: e.target.value })} />
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Contact phone</Label>
                <Input placeholder="For day-of coordination" value={wiz.contactPhone} onChange={(e) => wiz.patch({ contactPhone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes for the artist</Label>
                <Textarea placeholder="Inspiration links, allergies, headcount details…" value={wiz.notes} onChange={(e) => wiz.patch({ notes: e.target.value })} maxLength={2000} />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: review --------------------------------------------------- */}
        {wiz.step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">When</p>
                  <p className="text-sm font-semibold">{wiz.slot ? formatBookingTime(wiz.slot, { withDate: true }) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Where</p>
                  <p className="text-sm font-semibold">
                    {wiz.locationType === "STUDIO"
                      ? `At the artist's studio · ${artist.city ?? ""}`
                      : wiz.locationType === "HOME"
                        ? wiz.addressLine || "—"
                        : wiz.addressLine || "Event venue"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Services</p>
                  <ul className="mt-1 space-y-1">
                    {selected.map((s) => (
                      <li key={s.id} className="flex justify-between text-sm">
                        <span>{s.name} <span className="text-muted-foreground">({durationLabel(s.durationMin)})</span></span>
                        <span className="font-medium">from ₹{s.priceFrom.toLocaleString("en-IN")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {wiz.isGroup && (
                  <div className="sm:col-span-2 rounded-xl bg-secondary/60 p-3 text-sm">
                    <Users className="mr-1 inline h-4 w-4 text-primary" />
                    <strong>{wiz.groupName || "Group event"}</strong> · {wiz.headcount || "?"} people
                  </div>
                )}
                {wiz.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm">{wiz.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex items-start gap-2 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Booking on Sevika is <strong>always free</strong> — no platform fee, no commission, no card required.
                {BRAND.paymentNote}
              </p>
            </div>
            {sessionStatus !== "authenticated" && (
              <p className="text-center text-sm text-muted-foreground">
                You&apos;ll be asked to{" "}
                <Link href={`/login?callbackUrl=/book/${artist.id}`} className="font-semibold text-primary hover:underline">
                  sign in
                </Link>{" "}
                to send this request.
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Nav buttons ------------------------------------------------------ */}
      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" disabled={wiz.step === 0} onClick={() => wiz.setStep(wiz.step - 1)}>
          <ArrowLeft /> Back
        </Button>
        {wiz.step < 3 ? (
          <Button disabled={!canNext} onClick={() => wiz.setStep(wiz.step + 1)}>
            Continue <ArrowRight />
          </Button>
        ) : (
          <Button size="lg" disabled={submitting || !wiz.slot} onClick={submit}>
            {submitting ? <Loader2 className="animate-spin" /> : <Scissors />}
            {submitting ? "Sending…" : "Request booking — free"}
          </Button>
        )}
      </div>
      {slotsTouched && wiz.step === 1 && !wiz.slot && (slotsQuery.data?.slots.length ?? 0) > 0 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">Pick a start time above to continue</p>
      )}
    </div>
  );
}
