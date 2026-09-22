"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Images, Play } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared";
import { cn } from "@/lib/utils";

interface PortfolioItem {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  thumbUrl: string | null;
  title: string | null;
  category: string | null;
}

export function PortfolioGallery({ items }: { items: PortfolioItem[] }) {
  const [active, setActive] = useState<PortfolioItem | null>(null);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Images />}
        title="No portfolio yet"
        description="This artist hasn't uploaded work samples yet."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 40, 400) }}
            onClick={() => setActive(item)}
            className="group relative aspect-square overflow-hidden rounded-2xl border bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {item.type === "VIDEO" ? (
              <>
                {item.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbUrl} alt={item.title ?? "Portfolio"} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary"><Play className="h-10 w-10 text-muted-foreground" /></div>
                )}
                <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">VIDEO</span>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={item.title ?? "Portfolio"} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            )}
            {item.title && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent p-2 text-left text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {item.title}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-3xl p-0">
          <DialogTitle className="sr-only">{active?.title ?? "Portfolio item"}</DialogTitle>
          {active?.type === "VIDEO" ? (
            <video src={active.url} controls autoPlay className={cn("w-full rounded-2xl")} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active?.url} alt={active?.title ?? ""} className="max-h-[75vh] w-full rounded-2xl object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
