"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import { CATEGORIES } from "@/lib/constants";
import { api } from "@/lib/client";
import { durationLabel } from "@/lib/utils";

interface ServiceRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  priceFrom: number;
  durationMin: number;
  isActive: boolean;
}

const EMPTY = { name: "", category: "hair", description: "", priceFrom: "500", durationMin: "60", isActive: true };

export default function ServicesPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery<{ services: ServiceRow[] }>({
    queryKey: ["artist", "services"],
    queryFn: () => api("/api/services"),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        priceFrom: Number(form.priceFrom),
        durationMin: Number(form.durationMin),
        isActive: form.isActive,
      };
      return editing
        ? api(`/api/services/${editing.id}`, { method: "PATCH", json: payload })
        : api("/api/services", { method: "POST", json: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Service updated" : "Service added");
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["artist", "services"] });
      qc.invalidateQueries({ queryKey: ["artist", "dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/services/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Service removed");
      qc.invalidateQueries({ queryKey: ["artist", "services"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openDialog(service?: ServiceRow) {
    setEditing(service ?? null);
    setForm(
      service
        ? {
            name: service.name,
            category: service.category,
            description: service.description ?? "",
            priceFrom: String(service.priceFrom),
            durationMin: String(service.durationMin),
            isActive: service.isActive,
          }
        : EMPTY
    );
    setDialogOpen(true);
  }

  const services = data?.services ?? [];

  return (
    <div>
      <PageHeader
        title="Services"
        description="What you offer, for how long, starting at what price"
        actions={<Button onClick={() => openDialog()}><Plus /> Add service</Button>}
      />

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={<Scissors />}
          title="No services yet"
          description="Add the services you offer so customers can book you."
          action={<Button onClick={() => openDialog()}><Plus /> Add your first service</Button>}
        />
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{s.name}</p>
                    {!s.isActive && (
                      <Badge variant="outline" className="border-transparent bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  {s.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{s.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {durationLabel(s.durationMin)} · from ₹{s.priceFrom.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openDialog(s)}><Pencil /> Edit</Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete service"
                    onClick={() => {
                      if (confirm(`Remove "${s.name}"? Existing bookings keep their records.`)) remove.mutate(s.id);
                    }}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit service" : "Add a service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Service name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bridal HD makeup" maxLength={120} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.emoji} {c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Starting price (₹)</Label>
                <Input type="number" min={1} value={form.priceFrom} onChange={(e) => setForm({ ...form, priceFrom: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <Input type="number" min={15} max={600} step={15} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} id="active" />
                <Label htmlFor="active">Visible to customers</Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's included, brands you use…" maxLength={2000} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={save.isPending || form.name.trim().length < 2 || Number(form.priceFrom) < 1}
              onClick={() => save.mutate()}
            >
              {save.isPending && <Loader2 className="animate-spin" />} {editing ? "Save changes" : "Add service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
