import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, requireUser, route } from "@/lib/api-helpers";
import { artistProfileSchema, onlineStatusSchema, profileUpdateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const me = await db.user.findUnique({
    where: { id: user.id },
    include: { artistProfile: true },
  });
  return jsonOk({
    user: me
      ? {
          id: me.id,
          name: me.name,
          email: me.email,
          phone: me.phone,
          role: me.role,
          city: me.city,
          avatarUrl: me.avatarUrl,
          createdAt: me.createdAt,
          artistProfile: me.artistProfile,
        }
      : null,
  });
});

/** PATCH: update the signed-in user's own profile. */
export const PATCH = route(async (req) => {
  const user = await requireUser();
  const data = await parseBody(req, profileUpdateSchema);

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      phone: data.phone === null ? null : (data.phone || undefined),
      city: data.city === null ? null : (data.city || undefined),
      avatarUrl: data.avatarUrl === null ? null : data.avatarUrl,
    },
  });
  return jsonOk({ user: { id: updated.id, name: updated.name, avatarUrl: updated.avatarUrl } });
});

/** PUT: artist profile upsert (displayName, bio, service area, geo, etc.). */
export const PUT = route(async (req) => {
  const user = await requireUser(["ARTIST"]);
  const data = await parseBody(req, artistProfileSchema);

  const profile = await db.artistProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName: data.displayName,
      tagline: data.tagline || null,
      bio: data.bio || null,
      city: data.city || null,
      serviceArea: data.serviceArea || null,
      addressLine: data.addressLine || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      yearsExperience: data.yearsExperience,
      categories: data.categories,
      specialties: data.specialties,
      languages: data.languages,
      coverUrl: data.coverUrl ?? null,
    },
    update: {
      displayName: data.displayName,
      tagline: data.tagline || null,
      bio: data.bio || null,
      city: data.city || null,
      serviceArea: data.serviceArea || null,
      addressLine: data.addressLine || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      yearsExperience: data.yearsExperience,
      categories: data.categories,
      specialties: data.specialties,
      languages: data.languages,
      ...(data.coverUrl !== undefined ? { coverUrl: data.coverUrl ?? null } : {}),
      ...(data.onlineStatus ? { onlineStatus: data.onlineStatus } : {}),
    },
  });
  return jsonOk({ artistProfile: profile });
});

/** POST: quick Online/Busy/Offline toggle. */
export const POST = route(async (req) => {
  const user = await requireUser(["ARTIST"]);
  const { onlineStatus } = await parseBody(req, onlineStatusSchema);
  if (!user.artistProfileId) throw new ApiError(404, "Artist profile not found");

  const profile = await db.artistProfile.update({
    where: { id: user.artistProfileId },
    data: { onlineStatus },
  });
  return jsonOk({ artistProfile: profile });
});
