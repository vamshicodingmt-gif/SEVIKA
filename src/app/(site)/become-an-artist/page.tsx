"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { BadgeCheck, CalendarCheck, Loader2, MessageCircle, Star, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/client";
import { BRAND } from "@/lib/constants";

export default function BecomeAnArtistPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function startSelling() {
    if (status !== "authenticated") {
      router.push("/register?role=artist");
      return;
    }
    setBusy(true);
    try {
      await api("/api/me/become-artist", { method: "POST" });
      await update();
      toast.success("You're in! Let's build your artist profile 🎨");
      router.push("/artist/profile");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container max-w-4xl py-10">
      <PageHeader
        title="Grow your beauty business on Sevika"
        description="Free to join. Free to list. 0% commission — you keep every rupee you earn."
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Wallet, title: "0% commission", text: "No platform fees, no cuts, no middlemen. Ever." },
          { icon: TrendingUp, title: "Reach new clients", text: "Get discovered by customers searching your city and category." },
          { icon: CalendarCheck, title: "Own your calendar", text: "Working hours, blocked dates, instant requests — you're in control." },
        ].map((f) => (
          <Card key={f.title}>
            <CardContent className="p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <p className="mt-3 font-semibold">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { icon: BadgeCheck, title: "Get verified", text: "Upload certificates — verified artists earn customer trust and rank higher." },
          { icon: MessageCircle, title: "Chat before booking", text: "Answer questions, share looks and confirm details in Sevika chat." },
          { icon: Star, title: "Build reputation", text: "Collect reviews after completed jobs to rise up discovery." },
          { icon: CalendarCheck, title: "Group & event bookings", text: "Bridal parties, events and shoots — accept multi-person bookings." },
        ].map((f) => (
          <div key={f.title} className="flex gap-4 rounded-2xl border bg-card p-5">
            <f.icon className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">{f.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-3xl brand-gradient p-10 text-center text-white shadow-lg">
        <h2 className="text-2xl font-bold">Ready when you are — it&apos;s free</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/85">{BRAND.paymentNote}</p>
        <Button
          size="lg"
          variant="secondary"
          className="mt-6 bg-white text-rose-600 hover:bg-white/90"
          disabled={busy}
          onClick={startSelling}
        >
          {busy ? <Loader2 className="animate-spin" /> : null}
          {status === "authenticated" ? "Create my artist profile" : "Join as an artist"}
        </Button>
        <p className="mt-3 text-xs text-white/75">
          Already have an account?{" "}
          <Link href="/login" className="underline">Sign in</Link> and switch to artist in one tap.
        </p>
      </div>
    </div>
  );
}
