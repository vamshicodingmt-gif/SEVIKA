import { Suspense } from "react";
import { DiscoverContent } from "./discover-content";

export const metadata = { title: "Discover artists" };

export default function DiscoverPage() {
  return (
    <Suspense>
      <DiscoverContent />
    </Suspense>
  );
}
