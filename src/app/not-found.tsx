import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl">🌸</div>
      <h1 className="mt-4 text-2xl font-bold">This page doesn&apos;t exist</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        The link may be broken or the page may have moved. Let&apos;s get you back to discovering great artists.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild><Link href="/"><Compass /> Back home</Link></Button>
        <Button asChild variant="outline"><Link href="/discover">Discover artists</Link></Button>
      </div>
    </div>
  );
}
