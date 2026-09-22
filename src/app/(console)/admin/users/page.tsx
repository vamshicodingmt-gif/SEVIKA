"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, RotateCcw, Search, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/misc";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/utils";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  city: string | null;
  suspended: boolean;
  suspensionReason: string | null;
  createdAt: string;
  artistProfile: { id: string; displayName: string; verificationStatus: string; completedJobs: number } | null;
  _count: { bookingsAsCustomer: number; reviews: number };
}

const ROLE_BADGE: Record<string, string> = {
  CUSTOMER: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  ARTIST: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-400",
  ADMIN: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ users: UserRow[]; total: number; page: number; pageSize: number }>({
    queryKey: ["admin", "users", q, role, status, page],
    queryFn: () => api(`/api/admin/users?q=${encodeURIComponent(q)}&role=${role}&status=${status}&page=${page}`),
  });

  const patch = useMutation({
    mutationFn: ({ id, ...body }: { id: string; suspended?: boolean; suspensionReason?: string; role?: string }) =>
      api(`/api/admin/users/${id}`, { method: "PATCH", json: body }),
    onSuccess: (_d, vars) => {
      toast.success(vars.suspended === true ? "Account suspended" : vars.suspended === false ? "Account restored" : "User updated");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function suspend(user: UserRow) {
    const reason = prompt(`Reason for suspending ${user.name}?\nThey'll see this message.`);
    if (reason === null) return;
    patch.mutate({ id: user.id, suspended: true, suspensionReason: reason });
  }

  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1;

  return (
    <div>
      <PageHeader title="User management" description="Suspend, restore and manage roles" />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name or email…" className="pl-9" />
        </div>
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            <SelectItem value="CUSTOMER">Customers</SelectItem>
            <SelectItem value="ARTIST">Artists</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (data?.users.length ?? 0) === 0 ? (
        <EmptyState icon={<Users />} title="No users found" />
      ) : (
        <div className="space-y-2">
          {data!.users.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{u.name}</p>
                    <Badge variant="outline" className={`border-transparent text-[10px] ${ROLE_BADGE[u.role]}`}>{u.role}</Badge>
                    {u.suspended && (
                      <Badge variant="outline" className="border-transparent bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
                        Suspended
                      </Badge>
                    )}
                    {u.artistProfile && (
                      <Badge variant="outline" className="border-transparent bg-zinc-200 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300">
                        {u.artistProfile.verificationStatus === "VERIFIED" ? "Verified artist" : "Artist"}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {u.email} · joined {timeAgo(u.createdAt)}
                    {u.artistProfile ? ` · ${u.artistProfile.completedJobs} jobs` : u.role === "CUSTOMER" ? ` · ${u._count.bookingsAsCustomer} bookings` : ""}
                    {u.suspensionReason ? ` · reason: ${u.suspensionReason}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {u.role !== "ADMIN" && (
                    <Select
                      value={u.role}
                      onValueChange={(v) => patch.mutate({ id: u.id, role: v })}
                      disabled={patch.isPending}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CUSTOMER">Customer</SelectItem>
                        <SelectItem value="ARTIST">Artist</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {u.suspended ? (
                    <Button variant="outline" size="sm" disabled={patch.isPending} onClick={() => patch.mutate({ id: u.id, suspended: false })}>
                      <RotateCcw /> Restore
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" disabled={patch.isPending || u.role === "ADMIN"} onClick={() => suspend(u)}>
                      <Ban className="text-destructive" /> Suspend
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}
      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> All admin actions are recorded in the audit log.
      </p>
    </div>
  );
}
