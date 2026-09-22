import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BookingWizard } from "./booking-wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request a booking" };

export default async function BookPage({
  params,
  searchParams,
}: {
  params: { artistId: string };
  searchParams: { service?: string };
}) {
  const artist = await db.artistProfile.findUnique({
    where: { id: params.artistId },
    include: {
      user: { select: { suspended: true, avatarUrl: true } },
      services: { where: { isActive: true }, orderBy: { priceFrom: "asc" } },
    },
  }).catch(() => null);

  if (!artist || artist.user.suspended) notFound();

  const session = await getServerSession(authOptions);
  const customer = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, phone: true, city: true },
      })
    : null;

  return (
    <BookingWizard
      artist={{
        id: artist.id,
        displayName: artist.displayName,
        city: artist.city,
        serviceArea: artist.serviceArea,
        avatarUrl: artist.user.avatarUrl,
        onlineStatus: artist.onlineStatus,
      }}
      services={artist.services.map((s) => ({
        id: s.id,
        name: s.name,
        priceFrom: s.priceFrom,
        durationMin: s.durationMin,
        category: s.category,
      }))}
      preselectedServiceId={searchParams.service ?? null}
      customer={customer ? { name: customer.name, phone: customer.phone, city: customer.city } : null}
    />
  );
}
