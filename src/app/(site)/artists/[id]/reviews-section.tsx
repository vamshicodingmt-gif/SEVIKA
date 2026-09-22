"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/shared";
import { initials, timeAgo } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  artistReply: string | null;
  createdAt: string | Date;
  customer: { id: string; name: string; avatarUrl: string | null };
}

export function ReviewsSection({ artistId, initialReviews }: { artistId: string; initialReviews: Review[] }) {
  const [useRemote, setUseRemote] = useState(false);

  const query = useInfiniteQuery<{ reviews: Review[]; nextCursor: string | null }>({
    queryKey: ["artist-reviews", artistId],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/artists/${artistId}/reviews?take=10${pageParam ? `&cursor=${pageParam}` : ""}`);
      if (!res.ok) throw new Error("Failed to load reviews");
      return res.json();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: useRemote,
  });

  const reviews = useRemote
    ? query.data?.pages.flatMap((p) => p.reviews) ?? initialReviews
    : initialReviews;

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                {r.customer.avatarUrl ? <AvatarImage src={r.customer.avatarUrl} alt="" /> : null}
                <AvatarFallback>{initials(r.customer.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{r.customer.name}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</p>
              </div>
            </div>
            <RatingStars rating={r.rating} size={13} />
          </div>
          {r.comment && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>}
          {r.artistReply && (
            <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm">
              <p className="text-xs font-semibold">Reply from the artist</p>
              <p className="mt-1 text-muted-foreground">{r.artistReply}</p>
            </div>
          )}
        </div>
      ))}
      {!useRemote && reviews.length >= 10 && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setUseRemote(true)}>
          Load all reviews
        </Button>
      )}
      {useRemote && query.hasNextPage && (
        <Button variant="outline" size="sm" className="w-full" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
          {query.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
