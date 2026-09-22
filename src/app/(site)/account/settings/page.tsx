"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/misc";
import { CITIES } from "@/lib/constants";
import { api, uploadFile } from "@/lib/client";
import { initials } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const me = useQuery<{ user: { name: string; email: string; phone: string | null; city: string | null; avatarUrl: string | null } }>({
    queryKey: ["me"],
    queryFn: () => api("/api/me"),
  });

  const user = me.data?.user;

  const save = useMutation({
    mutationFn: (payload: { name: string; phone: string; city: string; avatarUrl: string | null }) =>
      api("/api/me", {
        method: "PATCH",
        json: {
          name: payload.name,
          phone: payload.phone || null,
          city: payload.city || null,
          ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
        },
      }),
    onSuccess: async () => {
      await update();
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onPickAvatar(file: File) {
    setAvatarBusy(true);
    try {
      const url = await uploadFile(file);
      save.mutate({ name: user?.name ?? "", phone: user?.phone ?? "", city: user?.city ?? "", avatarUrl: url });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAvatarBusy(false);
    }
  }

  if (me.isLoading || !user) {
    return <div className="container max-w-xl py-8 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-80" /></div>;
  }

  return (
    <div className="container max-w-xl py-8">
      <PageHeader title="Settings" description="Your Sevika profile details" />

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Avatar className="h-20 w-20 border">
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                <AvatarFallback className="text-xl">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 rounded-full brand-gradient p-2 text-white shadow"
                aria-label="Change photo"
              >
                {avatarBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onPickAvatar(e.target.files[0])}
              />
            </div>
            <div>
              <p className="text-sm font-semibold">Profile photo</p>
              <p className="text-xs text-muted-foreground">JPG or PNG, square works best</p>
            </div>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              save.mutate({
                name: String(fd.get("name") ?? user.name),
                phone: String(fd.get("phone") ?? ""),
                city: String(fd.get("city") ?? ""),
                avatarUrl: user.avatarUrl,
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={user.name} required minLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled />
              <p className="text-xs text-muted-foreground">Email can&apos;t be changed right now</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={user.phone ?? ""} placeholder="+91…" />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <input type="hidden" name="city" value="" />
                <Select
                  defaultValue={user.city ?? undefined}
                  onValueChange={(v) => {
                    const input = document.querySelector<HTMLInputElement>('input[name="city"]');
                    if (input) input.value = v;
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
