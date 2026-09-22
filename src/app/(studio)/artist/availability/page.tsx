"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarOff, Clock, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/misc";
import { WEEKDAYS } from "@/lib/constants";
import { api } from "@/lib/client";
import { cn, minutesToLabel } from "@/lib/utils";

interface Rule {
  id?: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
}
interface BlockedDate {
  id: string;
  date: string;
  note: string | null;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => i * 30);

function TimeSelect({ value, onChange, ariaLabel }: { value: number; onChange: (v: number) => void; ariaLabel: string }) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-9 rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t}>{minutesToLabel(t)}</option>
      ))}
    </select>
  );
}

export default function AvailabilityPage() {
  const qc = useQueryClient();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loaded, setLoaded] = useState(false);

  const { data, isLoading } = useQuery<{ rules: Rule[] }>({
    queryKey: ["artist", "availability"],
    queryFn: () => api("/api/availability"),
  });

  useEffect(() => {
    if (data && !loaded) {
      setRules(data.rules.map(({ weekday, startMinute, endMinute }) => ({ weekday, startMinute, endMinute })));
      setLoaded(true);
    }
  }, [data, loaded]);

  const blocked = useQuery<{ blocked: BlockedDate[] }>({
    queryKey: ["artist", "blocked"],
    queryFn: () => api("/api/availability/blocked"),
  });

  const saveRules = useMutation({
    mutationFn: () => api("/api/availability", { method: "PUT", json: { rules } }),
    onSuccess: () => {
      toast.success("Working hours saved");
      qc.invalidateQueries({ queryKey: ["artist", "availability"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addBlocked = useMutation({
    mutationFn: (payload: { date: string; note: string }) =>
      api("/api/availability/blocked", { method: "POST", json: payload }),
    onSuccess: () => {
      toast.success("Date blocked");
      qc.invalidateQueries({ queryKey: ["artist", "blocked"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBlocked = useMutation({
    mutationFn: (id: string) => api(`/api/availability/blocked?id=${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["artist", "blocked"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const hasConflict = rules.some((r) => r.startMinute >= r.endMinute);

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-56" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Availability"
        description="Set weekly working hours — customers can only book inside them"
        actions={
          <Button disabled={saveRules.isPending || hasConflict} onClick={() => saveRules.mutate()}>
            {saveRules.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save hours
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="p-6">
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-primary" /> Weekly hours</p>
          <div className="space-y-2">
            {WEEKDAYS.map((day) => {
              const dayRules = rules.filter((r) => r.weekday === day.value);
              return (
                <div key={day.value} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                  <span className="w-20 text-sm font-medium">{day.label}</span>
                  {dayRules.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  ) : (
                    <div className="flex flex-1 flex-wrap gap-2">
                      {dayRules.map((rule, idx) => (
                        <span key={idx} className={cn("inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-1 text-sm", rule.startMinute >= rule.endMinute && "ring-2 ring-destructive")}>
                          <TimeSelect
                            ariaLabel={`${day.label} start`}
                            value={rule.startMinute}
                            onChange={(v) => setRules(rules.map((r) => (r === rule ? { ...r, startMinute: v } : r)))}
                          />
                          <span className="text-muted-foreground">–</span>
                          <TimeSelect
                            ariaLabel={`${day.label} end`}
                            value={rule.endMinute}
                            onChange={(v) => setRules(rules.map((r) => (r === rule ? { ...r, endMinute: v } : r)))}
                          />
                          <button
                            aria-label="Remove window"
                            className="rounded p-1 hover:bg-background"
                            onClick={() => setRules(rules.filter((r) => r !== rule))}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setRules([...rules, { weekday: day.value, startMinute: 9 * 60, endMinute: 17 * 60 }])
                    }
                  >
                    <Plus /> {dayRules.length === 0 ? "Set hours" : "Add window"}
                  </Button>
                </div>
              );
            })}
          </div>
          {hasConflict && <p className="mt-3 text-xs text-destructive">A start time is after its end time — fix the highlighted row.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold"><CalendarOff className="h-4 w-4 text-primary" /> Blocked dates (holidays, time off)</p>
          <form
            className="mb-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const date = String(fd.get("date") ?? "");
              if (date) addBlocked.mutate({ date, note: String(fd.get("note") ?? "") });
              e.currentTarget.reset();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" required className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note (optional)</Label>
              <Input id="note" name="note" placeholder="e.g. Family wedding" className="w-56" maxLength={200} />
            </div>
            <Button type="submit" variant="outline" disabled={addBlocked.isPending}>Block date</Button>
          </form>
          {(blocked.data?.blocked.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No blocked dates — you&apos;re available every working day.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {blocked.data!.blocked.map((b) => (
                <span key={b.id} className="inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1.5 text-sm">
                  {new Date(`${b.date}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })}
                  {b.note && <span className="text-xs text-muted-foreground">· {b.note}</span>}
                  <button aria-label="Unblock" onClick={() => removeBlocked.mutate(b.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
