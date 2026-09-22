import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { BRAND } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: {
    default: "Sevika — Book trusted beauty & grooming professionals",
    template: "%s · Sevika",
  },
  description:
    "Sevika is a free marketplace connecting customers with beauty and grooming professionals. 0% commission — payments are arranged directly between the customer and professional.",
  keywords: ["Sevika", "beauty marketplace", "book makeup artist", "grooming", "bridal makeup", "home salon"],
  applicationName: "Sevika",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    type: "website",
    siteName: "Sevika",
    title: "Sevika — Book trusted beauty & grooming professionals",
    description:
      "Discover professionals, view portfolios, book appointments and chat — free, with 0% commission.",
  },
  twitter: { card: "summary_large_image", title: "Sevika" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf5f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0d12" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
