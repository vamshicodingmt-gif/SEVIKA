import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { ApiError, jsonOk, parseBody, route } from "@/lib/api-helpers";
import { registerSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/ratelimit";
import { notify } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { sendMail, emailShell, appLink } from "@/lib/mail";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const data = await parseBody(req, registerSchema);

  const limit = await rateLimit("auth", data.email);
  if (!limit.success) throw new ApiError(429, "Too many attempts — try again in a few minutes");

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ApiError(409, "An account with this email already exists — try signing in");

  const passwordHash = await hash(data.password, 12);

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      phone: data.phone || null,
      city: data.city || null,
      role: data.role,
      ...(data.role === "ARTIST"
        ? {
            artistProfile: {
              create: {
                displayName: data.name,
                city: data.city || null,
                onlineStatus: "OFFLINE",
              },
            },
          }
        : {}),
    },
    include: { artistProfile: { select: { id: true } } },
  });

  await notify({
    userId: user.id,
    type: "SYSTEM",
    title: "Welcome to Sevika! 🌸",
    body:
      data.role === "ARTIST"
        ? "Complete your artist profile, add services and set availability to start receiving bookings."
        : "Discover beauty & grooming professionals and book your first appointment — it's free.",
    link: data.role === "ARTIST" ? "/artist/profile" : "/discover",
  });

  await sendMail({
    to: user.email,
    subject: `Welcome to Sevika, ${user.name}!`,
    html: emailShell(
      "Welcome to Sevika 🌸",
      `<p style="color:#52525b;font-size:14px;line-height:1.6;">Hi ${user.name},</p>
       <p style="color:#52525b;font-size:14px;line-height:1.6;">Your Sevika account is ready. Sevika is a free marketplace with <strong>0% commission</strong> — ${
         data.role === "ARTIST"
           ? "you keep 100% of what you earn, and customers arrange payment with you directly."
           : "you only ever pay the professional directly for their craft."
       }</p>
       <p style="margin:24px 0;"><a href="${appLink(data.role === "ARTIST" ? "/artist/profile" : "/discover")}" style="background:#e11d48;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-size:14px;">Get started</a></p>`
    ),
  });

  await audit({
    actorId: user.id,
    actorEmail: user.email,
    action: "user.register",
    targetType: "USER",
    targetId: user.id,
    meta: { role: user.role },
  });

  return jsonOk(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        artistProfileId: user.artistProfile?.id ?? null,
      },
    },
    201
  );
});
