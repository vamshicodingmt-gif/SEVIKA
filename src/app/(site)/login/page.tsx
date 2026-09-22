"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";
import { BrandMark } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginForm = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginForm>;

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginForm),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginForm) {
    setSubmitting(true);
    const res = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    setSubmitting(false);
    if (res?.error) {
      // NextAuth masks authorize errors — distinguish suspension explicitly.
      try {
        const status = await fetch("/api/auth/account-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: values.email }),
        }).then((r) => r.json());
        if (status?.suspended) {
          toast.error(
            `Your account has been suspended.${status.reason ? ` Reason: ${status.reason}` : ""} Contact support@sevika.app`
          );
          return;
        }
      } catch {
        /* fall through to generic message */
      }
      toast.error("Invalid email or password");
      return;
    }
    toast.success("Welcome back to Sevika 🌸");
    // Role-aware redirect
    try {
      const me = await fetch("/api/me").then((r) => r.json());
      const role = me?.user?.role;
      if (callbackUrl !== "/") router.push(callbackUrl);
      else if (role === "ARTIST") router.push("/artist");
      else if (role === "ADMIN") router.push("/admin");
      else router.push("/discover");
    } catch {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="container flex max-w-md flex-col items-center justify-center py-16">
      <div className="mb-6 flex flex-col items-center">
        <BrandMark className="h-14 w-14" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Welcome back to Sevika</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to manage bookings, chats and more</p>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use the email and password you registered with</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
              {formState.errors.email && <p className="text-xs text-destructive">{formState.errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
              {formState.errors.password && <p className="text-xs text-destructive">{formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <LogIn />} Sign in
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New to Sevika?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">Create a free account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
