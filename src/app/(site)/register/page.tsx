"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Scissors, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES } from "@/lib/constants";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

const registerForm = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").max(72),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().optional(),
});
type RegisterForm = z.infer<typeof registerForm>;

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<"CUSTOMER" | "ARTIST">(
    params.get("role") === "artist" ? "ARTIST" : "CUSTOMER"
  );
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerForm),
    defaultValues: { name: "", email: "", password: "", phone: "" },
  });

  async function onSubmit(values: RegisterForm) {
    setSubmitting(true);
    try {
      await api("/api/auth/register", { method: "POST", json: { ...values, role, city: values.city ?? "" } });
      await signIn("credentials", { email: values.email, password: values.password, redirect: false });
      toast.success("Welcome to Sevika! 🌸");
      router.push(role === "ARTIST" ? "/artist/profile" : "/discover");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container flex max-w-lg flex-col items-center justify-center py-14">
      <div className="mb-6 flex flex-col items-center text-center">
        <BrandMark className="h-14 w-14" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Join Sevika — it&apos;s free</h1>
        <p className="mt-1 text-sm text-muted-foreground">0% commission · no booking fees · ever</p>
      </div>

      <div className="mb-5 grid w-full grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRole("CUSTOMER")}
          className={cn(
            "rounded-2xl border bg-card p-4 text-center transition-all",
            role === "CUSTOMER" ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40"
          )}
        >
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-2 text-sm font-semibold">I need services</p>
          <p className="text-xs text-muted-foreground">Book beauty pros</p>
        </button>
        <button
          type="button"
          onClick={() => setRole("ARTIST")}
          className={cn(
            "rounded-2xl border bg-card p-4 text-center transition-all",
            role === "ARTIST" ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40"
          )}
        >
          <Scissors className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-2 text-sm font-semibold">I&apos;m an artist</p>
          <p className="text-xs text-muted-foreground">Offer services</p>
        </button>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{role === "ARTIST" ? "Create your artist account" : "Create your account"}</CardTitle>
          <CardDescription>
            {role === "ARTIST"
              ? "Build a profile, list services and get booked — you keep 100% of your earnings."
              : "Discover professionals, chat and book in minutes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" placeholder={role === "ARTIST" ? "e.g. Aarohi Makeup Studio" : "e.g. Priya Sharma"} {...register("name")} />
              {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
                {formState.errors.email && <p className="text-xs text-destructive">{formState.errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="8+ characters" {...register("password")} />
                {formState.errors.password && <p className="text-xs text-destructive">{formState.errors.password.message}</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" placeholder="+91…" {...register("phone")} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Select onValueChange={(v) => setValue("city", v)}>
                  <SelectTrigger><SelectValue placeholder="Select your city" /></SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : null}
              Create free account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterInner />
    </Suspense>
  );
}
