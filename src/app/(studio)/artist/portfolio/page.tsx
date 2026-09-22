"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EyeOff, FolderOpen, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import { CATEGORIES } from "@/lib/constants";
import { api, uploadFile } from "@/lib/client";

interface PortfolioRow {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  thumbUrl: string | null;
  title: string | null;
  category: string | null;
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

const MOD_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  REJECTED: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400",
};

export default function PortfolioPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("makeup");

  const { data, isLoading } = useQuery<{ items: PortfolioRow[] }>({
    queryKey: ["artist", "portfolio"],
    queryFn: () => api("/api/portfolio"),
  });

  const create = useMutation({
    mutationFn: (input: { type: "IMAGE" | "VIDEO"; url: string; title?: string; category?: string }) =>
      api("/api/portfolio", { method: "POST", json: input }),
    onSuccess: () => {
      toast.success("Uploaded — visible after a quick moderation check");
      setPendingFile(null);
      setTitle("");
      qc.invalidateQueries({ queryKey: ["artist", "portfolio"] });
      qc.invalidateQueries({ queryKey: ["artist", "dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/portfolio/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artist", "portfolio"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function pick(file: File) {
    setPendingFile(file);
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const url = await uploadFile(pendingFile);
      await create.mutateAsync({
        type: pendingFile.type === "video/mp4" ? "VIDEO" : "IMAGE",
        url,
        title: title || undefined,
        category: category || undefined,
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const items = data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Portfolio"
        description="Show your best work — images and videos build customer trust"
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
            />
            <Button onClick={() => fileRef.current?.click()}><Upload /> Upload</Button>
          </>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FolderOpen />}
          title="Portfolio is empty"
          description="Upload your best looks — JPG, PNG, WebP or MP4 (up to 50MB)."
          action={<Button onClick={() => fileRef.current?.click()}><Plus /> Upload your first work</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <Card key={item.id} className="group overflow-hidden">
              <div className="relative aspect-square bg-secondary">
                {item.type === "VIDEO" ? (
                  <>
                    {item.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbUrl} alt={item.title ?? ""} className="h-full w-full object-cover" />
                    ) : (
                      <video src={item.url} className="h-full w-full object-cover" muted />
                    )}
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">VIDEO</span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.title ?? ""} className="h-full w-full object-cover" loading="lazy" />
                )}
                {item.moderationStatus !== "APPROVED" && (
                  <Badge variant="outline" className={`absolute left-2 top-2 border-transparent ${MOD_BADGE[item.moderationStatus]}`}>
                    {item.moderationStatus === "PENDING" ? "In review" : "Rejected"}
                  </Badge>
                )}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => window.open(item.url, "_blank")}
                    aria-label="View"
                  >
                    <EyeOff className="rotate-180" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    aria-label="Delete"
                    onClick={() => confirm("Remove this item?") && remove.mutate(item.id)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="truncate text-sm font-medium">{item.title || "Untitled"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={pendingFile !== null} onOpenChange={(v) => !v && setPendingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Describe this work</DialogTitle>
          </DialogHeader>
          {pendingFile && (
            <div className="overflow-hidden rounded-xl bg-secondary">
              {pendingFile.type === "video/mp4" ? (
                <video src={URL.createObjectURL(pendingFile)} controls className="max-h-52 w-full object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(pendingFile)} alt="" className="max-h-52 w-full object-contain" />
              )}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ptitle">Title</Label>
              <Input id="ptitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bridal HD look — Mumbai" maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.emoji} {c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingFile(null)}>Cancel</Button>
            <Button disabled={uploading || create.isPending} onClick={confirmUpload}>
              {uploading || create.isPending ? <Loader2 className="animate-spin" /> : null} Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
