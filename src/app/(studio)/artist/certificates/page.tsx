"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Clock, FileText, GraduationCap, Loader2, Send, Trash2, Upload, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/misc";
import { api, uploadFile } from "@/lib/client";
import { timeAgo } from "@/lib/utils";

interface CertificateRow {
  id: string;
  title: string;
  issuer: string | null;
  fileUrl: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
}
interface VerificationRow {
  id: string;
  status: string;
  note: string | null;
  reviewNote: string | null;
  createdAt: string;
}

const CERT_STYLE: Record<string, { className: string; icon: typeof Clock; label: string }> = {
  PENDING: { className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400", icon: Clock, label: "In review" },
  VERIFIED: { className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400", icon: BadgeCheck, label: "Verified" },
  REJECTED: { className: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400", icon: XCircle, label: "Rejected" },
};

export default function CertificatesPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: "", issuer: "", fileUrl: "" });
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");

  const certificates = useQuery<{ certificates: CertificateRow[] }>({
    queryKey: ["artist", "certificates"],
    queryFn: () => api("/api/certificates"),
  });

  const verification = useQuery<{ request: VerificationRow | null }>({
    queryKey: ["artist", "verification"],
    queryFn: () => api("/api/verification"),
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!form.fileUrl) throw new Error("Upload the certificate file first");
      return api("/api/certificates", {
        method: "POST",
        json: { title: form.title, issuer: form.issuer || undefined, fileUrl: form.fileUrl },
      });
    },
    onSuccess: () => {
      toast.success("Certificate uploaded — pending review");
      setForm({ title: "", issuer: "", fileUrl: "" });
      qc.invalidateQueries({ queryKey: ["artist", "certificates"] });
      qc.invalidateQueries({ queryKey: ["artist", "dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requestVerification = useMutation({
    mutationFn: () => api("/api/verification", { method: "POST", json: { note: note || undefined } }),
    onSuccess: () => {
      toast.success("Verification request submitted 🎉");
      setNote("");
      qc.invalidateQueries({ queryKey: ["artist", "verification"] });
      qc.invalidateQueries({ queryKey: ["artist", "dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function pickFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setForm((f) => ({ ...f, fileUrl: url }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/certificates?id=${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artist", "certificates"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const certs = certificates.data?.certificates ?? [];
  const request = verification.data?.request ?? null;
  const verifiedCount = certs.filter((c) => c.status === "VERIFIED").length;

  return (
    <div>
      <PageHeader
        title="Certificates & verification"
        description="Verified profiles win customer trust and rank higher in discovery"
      />

      {/* Verification status ------------------------------------------------ */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <GraduationCap className="h-4 w-4 text-primary" /> Sevika verification
                <span className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${request?.status === "VERIFIED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : request?.status === "PENDING" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400"}`}>
                  {request ? request.status.replaceAll("_", " ") : certs.length > 0 ? "NOT REQUESTED" : "NO CERTIFICATES"}
                </span>
              </p>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                Upload your training or professional certificates (JPG, PNG or PDF). Once uploaded,
                request verification — the Sevika team reviews them manually.
              </p>
              {request?.reviewNote && (
                <p className="mt-2 rounded-lg bg-secondary p-3 text-sm">Reviewer note: {request.reviewNote}</p>
              )}
            </div>
            <Button
              disabled={certs.length === 0 || requestVerification.isPending || request?.status === "PENDING" || request?.status === "VERIFIED"}
              onClick={() => requestVerification.mutate()}
            >
              {requestVerification.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              {request?.status === "PENDING" ? "Under review" : request?.status === "VERIFIED" ? "Verified ✓" : "Request verification"}
            </Button>
          </div>
          <Textarea
            className="mt-4"
            placeholder="Note for the review team (optional) — e.g. which academy issued your certificates"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
          />
        </CardContent>
      </Card>

      {/* Upload form ---------------------------------------------------------- */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <p className="mb-4 text-sm font-semibold">Upload a certificate</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ctitle">Certificate title *</Label>
              <Input id="ctitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Advanced Makeup Artistry" maxLength={160} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cissuer">Issued by</Label>
              <Input id="cissuer" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="e.g. Lakmé Academy" maxLength={160} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />} {form.fileUrl ? "File attached ✓" : "Attach file"}
            </Button>
            <Button disabled={upload.isPending || !form.title.trim() || !form.fileUrl} onClick={() => upload.mutate()}>
              Add certificate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List -------------------------------------------------------------------- */}
      {certificates.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : certs.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No certificates uploaded"
          description="Artists with verified certificates get up to 3× more bookings."
        />
      ) : (
        <div className="space-y-2">
          {certs.map((c) => {
            const style = CERT_STYLE[c.status] ?? CERT_STYLE.PENDING;
            return (
              <Card key={c.id}>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <a href={c.fileUrl} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{c.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.issuer ? `${c.issuer} · ` : ""}uploaded {timeAgo(c.createdAt)}
                      </p>
                    </div>
                  </a>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${style.className}`}>
                    <style.icon className="h-3 w-3" /> {style.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete certificate"
                    onClick={() => confirm("Remove this certificate?") && remove.mutate(c.id)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {verifiedCount > 0 && (
            <p className="pt-2 text-center text-xs text-muted-foreground">
              {verifiedCount} verified certificate{verifiedCount > 1 ? "s" : ""} shown on your public profile ✓
            </p>
          )}
        </div>
      )}
    </div>
  );
}
