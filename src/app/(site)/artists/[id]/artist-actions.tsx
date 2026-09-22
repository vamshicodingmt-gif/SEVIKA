"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CalendarPlus, Flag, Heart, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/client";

const REPORT_REASONS = [
  "Inappropriate content",
  "Fake profile or impersonation",
  "Spam or scam",
  "Offensive behaviour",
  "Other",
];

export function ArtistActions({
  artistId,
  artistName,
  favorited,
  isOwner,
}: {
  artistId: string;
  artistName: string;
  favorited: boolean;
  isOwner: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [fav, setFav] = useState(favorited);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");

  const isCustomer = session?.user?.role === "CUSTOMER";

  async function toggleFavorite() {
    if (!session) return router.push(`/login?callbackUrl=/artists/${artistId}`);
    setBusy(true);
    try {
      if (fav) {
        await api(`/api/favorites?artistId=${artistId}`, { method: "DELETE" });
        setFav(false);
        toast("Removed from favorites");
      } else {
        await api("/api/favorites", { method: "POST", json: { artistId } });
        setFav(true);
        toast("Added to favorites 💖");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitReport() {
    try {
      await api("/api/reports", {
        method: "POST",
        json: { targetType: "ARTIST_PROFILE", targetId: artistId, reason, details },
      });
      setReportOpen(false);
      setDetails("");
      toast.success("Report submitted — our team will review it");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (isOwner) {
    return (
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm"><Link href="/artist/portfolio">Manage portfolio</Link></Button>
        <Button asChild size="sm"><Link href="/artist">Artist studio</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={toggleFavorite} aria-label="Save to favorites">
        <Heart className={fav ? "fill-rose-500 text-rose-500" : ""} /> {fav ? "Saved" : "Save"}
      </Button>
      {isCustomer && (
        <Button asChild variant="outline" size="sm">
          <Link href={`/messages?to=${artistId}`}><MessageCircle /> Chat</Link>
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)} aria-label={`Report ${artistName}`}>
        <Flag /> Report
      </Button>
      <Button asChild size="sm">
        <Link href={`/book/${artistId}`}><CalendarPlus /> Book</Link>
      </Button>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {artistName}</DialogTitle>
            <DialogDescription>Tell us what&apos;s wrong — the Sevika team reviews every report.</DialogDescription>
          </DialogHeader>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REPORT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Additional details (optional)"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={2000}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={submitReport}>Submit report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
