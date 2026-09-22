"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, CirclePause, CircleSlash } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "ONLINE", label: "Online — accepting bookings", icon: CheckCircle2, dot: "bg-emerald-500" },
  { value: "BUSY", label: "Busy — bookable later", icon: CirclePause, dot: "bg-amber-500" },
  { value: "OFFLINE", label: "Offline — hidden availability", icon: CircleSlash, dot: "bg-zinc-400" },
];

export function OnlineToggle({ current }: { current: string }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (onlineStatus: string) => api("/api/me", { method: "POST", json: { onlineStatus } }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["artist", "dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = OPTIONS.find((o) => o.value === current) ?? OPTIONS[2];

  return (
    <Select value={current} onValueChange={(v) => mutation.mutate(v)}>
      <SelectTrigger className="w-64">
        <SelectValue>
          <span className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full animate-pulse", active.dot)} />
            {active.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", o.dot)} />
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
