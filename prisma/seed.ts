/**
 * Sevika database seed — demo marketplace content.
 *
 *   npm run db:seed
 *
 * Creates an admin, artists with services/portfolio/certificates/availability,
 * customers, chats, bookings across every lifecycle state, reviews,
 * notifications, a report and a support ticket.
 *
 * Demo passwords:
 *   admin@sevika.app    → Admin@12345
 *   all other accounts  → Password@123
 *
 * Sevika is a 0% commission marketplace — the seed contains no payment data
 * because the platform never processes payments.
 */
import "dotenv/config";
import { PrismaClient, type BookingStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

const DEMO_PASSWORD = "Password@123";
const ADMIN_PASSWORD = "Admin@12345";

function when(daysFromNow: number, hourUtc: number, minute = 0) {
  const d = new Date();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysFromNow, hourUtc, minute));
  return target;
}

function isoDay(daysFromNow: number) {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysFromNow));
}

function img(id: string, w = 800) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;
}

async function main() {
  console.log("🌱 Seeding Sevika…");

  // ---------------------------------------------------------------- cleanup
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.ticketMessage.deleteMany(),
    db.supportTicket.deleteMany(),
    db.report.deleteMany(),
    db.favorite.deleteMany(),
    db.review.deleteMany(),
    db.notification.deleteMany(),
    db.message.deleteMany(),
    db.conversation.deleteMany(),
    db.bookingEvent.deleteMany(),
    db.bookingService.deleteMany(),
    db.booking.deleteMany(),
    db.blockedDate.deleteMany(),
    db.availabilityRule.deleteMany(),
    db.certificate.deleteMany(),
    db.portfolioItem.deleteMany(),
    db.service.deleteMany(),
    db.verificationRequest.deleteMany(),
    db.artistProfile.deleteMany(),
    db.user.deleteMany(),
  ]);

  const demoHash = await hash(DEMO_PASSWORD, 10);
  const adminHash = await hash(ADMIN_PASSWORD, 10);

  // ------------------------------------------------------------------ admin
  const admin = await db.user.create({
    data: {
      name: "Sevika Admin",
      email: "admin@sevika.app",
      passwordHash: adminHash,
      role: "ADMIN",
      city: "Mumbai",
    },
  });

  // ---------------------------------------------------------------- artists
  interface ArtistSpec {
    email: string;
    name: string;
    displayName: string;
    tagline: string;
    bio: string;
    city: string;
    serviceArea: string;
    lat: number;
    lng: number;
    years: number;
    categories: string[];
    specialties: string[];
    languages: string[];
    verification: "VERIFIED" | "PENDING" | "UNVERIFIED";
    online: "ONLINE" | "BUSY" | "OFFLINE";
    rating: [number, number];
    jobs: number;
    views: number;
    cover: string;
    avatar: string;
    services: Array<{ name: string; category: string; priceFrom: number; durationMin: number; description: string }>;
    portfolio: Array<{ url: string; title: string; type?: "VIDEO" }>;
    certificates: Array<{ title: string; issuer: string; status: "PENDING" | "VERIFIED" | "REJECTED" }>;
  }

  const artistSpecs: ArtistSpec[] = [
    {
      email: "aarohi@sevika.app",
      name: "Aarohi Deshmukh",
      displayName: "Aarohi Makeup Studio",
      tagline: "Bridal & HD makeup artist · 500+ brides",
      bio: "Award-winning bridal makeup artist with 8 years of experience across Mumbai. Trained at VLCC Academy, specialising in HD and airbrush bridal looks that photograph beautifully. I travel to your venue with a full professional kit and provide pre-bridal skin consults.",
      city: "Mumbai",
      serviceArea: "All Mumbai + 25km travel",
      lat: 19.076,
      lng: 72.8777,
      years: 8,
      categories: ["makeup", "bridal", "skin-facial"],
      specialties: ["Airbrush makeup", "HD bridal", "Saree draping", "Haldi looks"],
      languages: ["Hindi", "English", "Marathi"],
      verification: "VERIFIED",
      online: "ONLINE",
      rating: [4.9, 87],
      jobs: 312,
      views: 2140,
      cover: img("photo-1522335789203-aabd1fc54bc9", 1200),
      avatar: img("photo-1616683693504-3ea7e9ad6fec", 300),
      services: [
        { name: "Bridal HD makeup", category: "bridal", priceFrom: 18000, durationMin: 180, description: "Full bridal look with HD airbrush, lashes, draping and hair styling." },
        { name: "Party makeup", category: "makeup", priceFrom: 3500, durationMin: 90, description: "Glam party look with premium products." },
        { name: "Engagement makeup", category: "bridal", priceFrom: 9000, durationMin: 120, description: "Soft-glam engagement look with hairstyling." },
        { name: "Bridal facial glow-up", category: "skin-facial", priceFrom: 2500, durationMin: 60, description: "Pre-bridal radiance facial." },
      ],
      portfolio: [
        { url: img("photo-1596704017254-9b121068fb31"), title: "Classic Maharashtrian bridal" },
        { url: img("photo-1519741497674-611481863552"), title: "Christian bridal glow" },
        { url: img("photo-1529626455594-4ff0802cfb7e"), title: "Reception glam" },
        { url: img("photo-1487412947147-5cebf100ffc2"), title: "Haldi morning look" },
        { url: img("photo-1512496015851-a90fb38ba796"), title: "Mehendi fresh makeup" },
      ],
      certificates: [
        { title: "Advanced Makeup Artistry", issuer: "VLCC Academy, Mumbai", status: "VERIFIED" },
        { title: "Airbrush Specialisation", issuer: "Temperley Academy", status: "VERIFIED" },
      ],
    },
    {
      email: "kabir@sevika.app",
      name: "Kabir Singh",
      displayName: "Kabir | Barber & Grooming",
      tagline: "Precision cuts & beard sculpting at your doorstep",
      bio: "Barber with 6 years of experience from Bhopal, now serving Bengaluru. Fade specialist. I bring a full kit — clipper, razor, sterilised tools, and premium styling products for a barbershop finish at home.",
      city: "Bengaluru",
      serviceArea: "Indiranagar, Koramangala, HSR Layout",
      lat: 12.9716,
      lng: 77.5946,
      years: 6,
      categories: ["mens-grooming", "hair"],
      specialties: ["Skin fades", "Beard sculpting", "Head massage"],
      languages: ["Hindi", "English", "Kannada"],
      verification: "VERIFIED",
      online: "ONLINE",
      rating: [4.8, 64],
      jobs: 208,
      views: 1430,
      cover: img("photo-1503951914875-452162b0f3f1", 1200),
      avatar: img("photo-1472099645785-5658abf4ff4e", 300),
      services: [
        { name: "Signature haircut", category: "mens-grooming", priceFrom: 700, durationMin: 45, description: "Consult, precision cut, wash and style." },
        { name: "Beard sculpt & shave", category: "mens-grooming", priceFrom: 450, durationMin: 30, description: "Hot-towel shave with razor line-up." },
        { name: "Haircut + beard combo", category: "mens-grooming", priceFrom: 1000, durationMin: 75, description: "The full groom package." },
        { name: "Hair colour & camo", category: "hair", priceFrom: 1200, durationMin: 60, description: "Grey coverage or fashion colour." },
      ],
      portfolio: [
        { url: img("photo-1622286342621-4bd786c2447c"), title: "Mid fade" },
        { url: img("photo-1621605815971-f12898a7086e"), title: "Beard sculpt" },
        { url: img("photo-1519014816548-bf5fe059798b"), title: "Classic pompadour" },
      ],
      certificates: [
        { title: "Professional Barbering Level 3", issuer: "Tonny Guy Academy", status: "VERIFIED" },
      ],
    },
    {
      email: "meera@sevika.app",
      name: "Meera Nair",
      displayName: "Meera Skin & Spa Therapy",
      tagline: "Facials, spa & wellness at home",
      bio: "Certified aesthetician and spa therapist from Kochi. Facials, cleanups, relaxation and deep-tissue massage with hospital-grade hygiene standards. All products are dermat-tested and single-use kits for every session.",
      city: "Kochi",
      serviceArea: "Ernakulam + Fort Kochi",
      lat: 9.9312,
      lng: 76.2673,
      years: 5,
      categories: ["skin-facial", "spa-massage", "waxing-threading"],
      specialties: ["Korean glass facial", "Deep tissue massage", "Aromatherapy"],
      languages: ["Malayalam", "English", "Hindi"],
      verification: "PENDING",
      online: "BUSY",
      rating: [4.7, 41],
      jobs: 122,
      views: 860,
      cover: img("photo-1544161515-4ab6ce6db874", 1200),
      avatar: img("photo-1438761681033-6461ffad8d80", 300),
      services: [
        { name: "Korean glass facial", category: "skin-facial", priceFrom: 2200, durationMin: 75, description: "10-step hydration facial for glass skin." },
        { name: "Relaxation massage", category: "spa-massage", priceFrom: 1800, durationMin: 60, description: "Full-body aromatherapy relaxation." },
        { name: "Deep cleanup", category: "skin-facial", priceFrom: 1200, durationMin: 45, description: "Steam, exfoliation and extraction." },
        { name: "Full arms & legs waxing", category: "waxing-threading", priceFrom: 900, durationMin: 40, description: "Rica wax with soothing post-care." },
      ],
      portfolio: [
        { url: img("photo-1570172619644-dfd03ed5d881"), title: "Spa setup at home" },
        { url: img("photo-1519823551278-64ac92734fb1"), title: "Glass facial results" },
      ],
      certificates: [
        { title: "CIDESCO Aesthetics", issuer: "CIDESCO International", status: "PENDING" },
        { title: "Spa Therapy Diploma", issuer: "Ananda Spa Institute", status: "PENDING" },
      ],
    },
    {
      email: "sana@sevika.app",
      name: "Sana Qureshi",
      displayName: "Sana Nail Artistry",
      tagline: "Gel extensions & hand-painted nail art",
      bio: "Nail artist from Delhi with 4 years of studio experience. Gel extensions, chrome, and bridal nail art. Strictly sanitised tools and single-use files.",
      city: "Delhi NCR",
      serviceArea: "South Delhi & Gurgaon",
      lat: 28.6139,
      lng: 77.209,
      years: 4,
      categories: ["nails", "waxing-threading"],
      specialties: ["Gel extensions", "Chrome nails", "Bridal nail art"],
      languages: ["Hindi", "English"],
      verification: "UNVERIFIED",
      online: "ONLINE",
      rating: [4.6, 28],
      jobs: 88,
      views: 640,
      cover: img("photo-1604654894610-df63bc536371", 1200),
      avatar: img("photo-1494790108377-be9c29b29330", 300),
      services: [
        { name: "Gel extensions with art", category: "nails", priceFrom: 2500, durationMin: 120, description: "Extensions, gel colour and custom art." },
        { name: "Classic manicure", category: "nails", priceFrom: 800, durationMin: 45, description: "Shaping, cuticle care and polish." },
        { name: "Pedicure spa", category: "nails", priceFrom: 1100, durationMin: 60, description: "Soak, scrub, mask and massage." },
      ],
      portfolio: [
        { url: img("photo-1610992015732-2449b76344bc"), title: "Chrome set" },
        { url: img("photo-1632345031435-8727f6897d53"), title: "Bridal nude set" },
      ],
      certificates: [
        { title: "Nail Technician Certificate", issuer: "Delhi Nail Academy", status: "PENDING" },
      ],
    },
    {
      email: "pooja@sevika.app",
      name: "Pooja Iyer",
      displayName: "Pooja Hair Couture",
      tagline: "Hair styling & colour for weddings & shoots",
      bio: "Hair stylist and colourist with 10 years of salon and freelance experience in Pune. Bridal updos, balayage and keratin treatments. Session stylist for fashion shoots.",
      city: "Pune",
      serviceArea: "Pune city + PCMC",
      lat: 18.5204,
      lng: 73.8567,
      years: 10,
      categories: ["hair", "bridal"],
      specialties: ["Bridal updos", "Balayage", "Keratin treatment"],
      languages: ["English", "Hindi", "Marathi", "Tamil"],
      verification: "VERIFIED",
      online: "OFFLINE",
      rating: [4.9, 103],
      jobs: 264,
      views: 1780,
      cover: img("photo-1560869713-7d0a29430803", 1200),
      avatar: img("photo-1573496359142-b8d87734a5a2", 300),
      services: [
        { name: "Bridal hair styling", category: "bridal", priceFrom: 6500, durationMin: 120, description: "Trial + wedding-day styling with accessories." },
        { name: "Balayage & gloss", category: "hair", priceFrom: 5500, durationMin: 180, description: "Hand-painted highlights with gloss." },
        { name: "Keratin treatment", category: "hair", priceFrom: 4500, durationMin: 150, description: "Smoothening with salon-grade keratin." },
        { name: "Party hairstyle", category: "hair", priceFrom: 1500, durationMin: 45, description: "Curls, waves or sleek bun." },
      ],
      portfolio: [
        { url: img("photo-1595476108010-b4d1f102b1b1"), title: "Bridal low bun" },
        { url: img("photo-1522337660859-02fbefca4702"), title: "Balayage transformation" },
        { url: img("photo-1492106087820-71f1a00d2b11"), title: "Editorial waves" },
      ],
      certificates: [
        { title: "Senior Hair Colourist", issuer: "Schwarzkopf Professional", status: "VERIFIED" },
      ],
    },
    {
      email: "arjun@sevika.app",
      name: "Arjun Mehta",
      displayName: "Arjun | Stylist on the go",
      tagline: "Unisex styling & grooming for events",
      bio: "Freelance stylist covering Hyderabad events — from corporate grooming sessions to sangeet styling. Quick, tidy and reliable.",
      city: "Hyderabad",
      serviceArea: "Hyderabad + Secunderabad",
      lat: 17.385,
      lng: 78.4867,
      years: 3,
      categories: ["hair", "mens-grooming", "makeup"],
      specialties: ["Event styling", "Corporate grooming"],
      languages: ["English", "Hindi", "Telugu"],
      verification: "UNVERIFIED",
      online: "ONLINE",
      rating: [0, 0],
      jobs: 12,
      views: 210,
      cover: img("photo-1560066984-138dadb4c035", 1200),
      avatar: img("photo-1500648767791-00dcc994a43e", 300),
      services: [
        { name: "Event styling (per person)", category: "hair", priceFrom: 900, durationMin: 40, description: "Blow-dry, curls or formal set." },
        { name: "Quick groom-up", category: "mens-grooming", priceFrom: 600, durationMin: 30, description: "Haircut + beard tidy." },
      ],
      portfolio: [
        { url: img("photo-1580618672591-eb180b1a973f"), title: "Sangeet styling" },
      ],
      certificates: [],
    },
  ];

  const artists: Array<{ profileId: string; userId: string; spec: ArtistSpec; services: Record<string, string> }> = [];

  for (const spec of artistSpecs) {
    const user = await db.user.create({
      data: {
        name: spec.name,
        email: spec.email,
        passwordHash: demoHash,
        city: spec.city,
        avatarUrl: spec.avatar,
        role: "ARTIST",
        artistProfile: {
          create: {
            displayName: spec.displayName,
            tagline: spec.tagline,
            bio: spec.bio,
            city: spec.city,
            serviceArea: spec.serviceArea,
            onlineStatus: spec.online,
            verificationStatus: spec.verification,
            yearsExperience: spec.years,
            categories: spec.categories,
            specialties: spec.specialties,
            languages: spec.languages,
            coverUrl: spec.cover,
            profileViews: spec.views,
            completedJobs: spec.jobs,
            ratingAvg: spec.rating[0],
            ratingCount: spec.rating[1],
            lat: spec.lat,
            lng: spec.lng,
          },
        },
      },
      include: { artistProfile: true },
    });
    const profileId = user.artistProfile!.id;

    const serviceIds: Record<string, string> = {};
    for (const s of spec.services) {
      const service = await db.service.create({
        data: { artistId: profileId, name: s.name, category: s.category, description: s.description, priceFrom: s.priceFrom, durationMin: s.durationMin },
      });
      serviceIds[s.name] = service.id;
    }

    for (const p of spec.portfolio) {
      await db.portfolioItem.create({
        data: { artistId: profileId, type: p.type ?? "IMAGE", url: p.url, title: p.title, moderationStatus: "APPROVED" },
      });
    }
    for (const c of spec.certificates) {
      await db.certificate.create({
        data: { artistId: profileId, title: c.title, issuer: c.issuer, fileUrl: "https://example.com/certificates/sample.pdf", status: c.status },
      });
    }

    // Working hours: Mon–Sat 10:00–19:00, plus a split on some
    for (const weekday of [1, 2, 3, 4, 5, 6]) {
      await db.availabilityRule.create({
        data: { artistId: profileId, weekday, startMinute: 10 * 60, endMinute: 19 * 60 },
      });
    }

    if (spec.verification === "PENDING") {
      await db.verificationRequest.create({
        data: {
          artistId: profileId,
          status: "PENDING",
          note: "Uploaded my CIDESCO and spa diplomas for review.",
        },
      });
    }

    artists.push({ profileId, userId: user.id, spec, services: serviceIds });
  }

  // -------------------------------------------------------------- customers
  const customersData = [
    { email: "priya@sevika.app", name: "Priya Sharma", city: "Mumbai", avatar: img("photo-1544005313-94ddf0286df2", 300) },
    { email: "rohan@sevika.app", name: "Rohan Verma", city: "Bengaluru", avatar: img("photo-1507003211169-0a1dd7228f2d", 300) },
  ];
  const customers = [];
  for (const c of customersData) {
    customers.push(
      await db.user.create({
        data: { name: c.name, email: c.email, passwordHash: demoHash, city: c.city, avatarUrl: c.avatar, role: "CUSTOMER" },
      })
    );
  }

  // --------------------------------------------------------------- bookings
  const aarohi = artists[0];
  const kabir = artists[1];
  const meera = artists[2];
  const pooja = artists[4];

  // 1) COMPLETED + reviewed (Priya ← Aarohi, party makeup 10 days ago)
  const b1 = await db.booking.create({
    data: {
      customerId: customers[0].id,
      artistId: aarohi.profileId,
      status: "COMPLETED",
      type: "INDIVIDUAL",
      scheduledAt: when(-10, 11),
      durationMin: 90,
      locationType: "HOME",
      addressLine: "B-702, Palm Springs, Powai",
      city: "Mumbai",
      pincode: "400076",
      contactPhone: "+91 98200 11111",
      notes: "Cocktail night look — golden tones.",
      services: {
        create: [{ serviceId: aarohi.services["Party makeup"], name: "Party makeup", priceAtBooking: 3500, durationMin: 90 }],
      },
      statusHistory: {
        create: [
          { actorId: customers[0].id, type: "CREATED", message: "Booking requested" },
          { actorId: aarohi.userId, type: "CONFIRM" },
          { actorId: aarohi.userId, type: "START" },
          { actorId: aarohi.userId, type: "COMPLETE" },
        ],
      },
    },
  });
  await db.review.create({
    data: {
      bookingId: b1.id,
      customerId: customers[0].id,
      artistId: aarohi.profileId,
      rating: 5,
      comment: "Aarohi is a magician! The makeup lasted through an 8-hour event and photographed beautifully. Super professional and punctual.",
      artistReply: "Thank you Priya! You were a delight to style. 💐",
    },
  });

  // 2) CONFIRMED upcoming (Priya ← Aarohi bridal in 6 days)
  await db.booking.create({
    data: {
      customerId: customers[0].id,
      artistId: aarohi.profileId,
      status: "CONFIRMED",
      type: "INDIVIDUAL",
      scheduledAt: when(6, 9),
      durationMin: 180,
      locationType: "VENUE",
      addressLine: "The Lalit, Andheri East",
      city: "Mumbai",
      notes: "Wedding morning — reach by 8:30am please.",
      contactPhone: "+91 98200 11111",
      services: {
        create: [{ serviceId: aarohi.services["Bridal HD makeup"], name: "Bridal HD makeup", priceAtBooking: 18000, durationMin: 180 }],
      },
      statusHistory: {
        create: [
          { actorId: customers[0].id, type: "CREATED", message: "Booking requested" },
          { actorId: aarohi.userId, type: "CONFIRM" },
        ],
      },
    },
  });

  // 3) PENDING group/event (Priya ← Meera spa party in 3 days)
  await db.booking.create({
    data: {
      customerId: customers[0].id,
      artistId: meera.profileId,
      status: "PENDING",
      type: "GROUP_EVENT",
      scheduledAt: when(3, 15),
      durationMin: 150,
      locationType: "HOME",
      addressLine: "B-702, Palm Springs, Powai",
      city: "Mumbai",
      groupName: "Priya's bridesmaid spa afternoon",
      headcount: 5,
      notes: "5 guests — cleanups and relaxation massages.",
      services: {
        create: [
          { serviceId: meera.services["Deep cleanup"], name: "Deep cleanup", priceAtBooking: 1200, durationMin: 45 },
          { serviceId: meera.services["Relaxation massage"], name: "Relaxation massage", priceAtBooking: 1800, durationMin: 60 },
        ],
      },
      statusHistory: { create: { actorId: customers[0].id, type: "CREATED", message: "Booking requested" } },
    },
  });

  // 4) RESCHEDULE_REQUESTED (Rohan ← Kabir, haircut in 2 days → proposed +1 day)
  await db.booking.create({
    data: {
      customerId: customers[1].id,
      artistId: kabir.profileId,
      status: "RESCHEDULE_REQUESTED",
      scheduledAt: when(2, 17),
      durationMin: 75,
      locationType: "HOME",
      addressLine: "Prestige Falcon City, Kanakapura Rd",
      city: "Bengaluru",
      rescheduleRequestedBy: "CUSTOMER",
      proposedAt: when(3, 17),
      preRescheduleStatus: "CONFIRMED",
      services: {
        create: [{ serviceId: kabir.services["Haircut + beard combo"], name: "Haircut + beard combo", priceAtBooking: 1000, durationMin: 75 }],
      },
      statusHistory: {
        create: [
          { actorId: customers[1].id, type: "CREATED", message: "Booking requested" },
          { actorId: kabir.userId, type: "CONFIRM" },
          { actorId: customers[1].id, type: "RESCHEDULE_PROPOSED", message: "Something came up at work" },
        ],
      },
    },
  });

  // 5) CANCELLED (Rohan ← Pooja)
  await db.booking.create({
    data: {
      customerId: customers[1].id,
      artistId: pooja.profileId,
      status: "CANCELLED",
      scheduledAt: when(-2, 16),
      durationMin: 45,
      locationType: "STUDIO",
      city: "Pune",
      cancelledById: customers[1].id,
      cancelReason: "Travel plans changed",
      services: {
        create: [{ serviceId: pooja.services["Party hairstyle"], name: "Party hairstyle", priceAtBooking: 1500, durationMin: 45 }],
      },
      statusHistory: {
        create: [
          { actorId: customers[1].id, type: "CREATED", message: "Booking requested" },
          { actorId: pooja.userId, type: "CONFIRM" },
          { actorId: customers[1].id, type: "CANCEL", message: "Travel plans changed" },
        ],
      },
    },
  });

  // 6) Another COMPLETED + review (Rohan ← Kabir, 20 days ago)
  const b6 = await db.booking.create({
    data: {
      customerId: customers[1].id,
      artistId: kabir.profileId,
      status: "COMPLETED",
      scheduledAt: when(-20, 10),
      durationMin: 45,
      locationType: "HOME",
      addressLine: "Prestige Falcon City, Kanakapura Rd",
      city: "Bengaluru",
      services: {
        create: [{ serviceId: kabir.services["Signature haircut"], name: "Signature haircut", priceAtBooking: 700, durationMin: 45 }],
      },
      statusHistory: {
        create: [
          { actorId: customers[1].id, type: "CREATED", message: "Booking requested" },
          { actorId: kabir.userId, type: "CONFIRM" },
          { actorId: kabir.userId, type: "COMPLETE" },
        ],
      },
    },
  });
  await db.review.create({
    data: {
      bookingId: b6.id,
      customerId: customers[1].id,
      artistId: kabir.profileId,
      rating: 5,
      comment: "Best fade I've had in Bangalore. Kabir brought his own setup — felt like a premium barbershop at home.",
    },
  });

  // A pending booking without review for artist dashboards
  await db.booking.create({
    data: {
      customerId: customers[0].id,
      artistId: pooja.profileId,
      status: "PENDING",
      scheduledAt: when(4, 12),
      durationMin: 45,
      locationType: "STUDIO",
      city: "Pune",
      notes: "Bridesmaid updo — will share inspo pics.",
      services: {
        create: [{ serviceId: pooja.services["Party hairstyle"], name: "Party hairstyle", priceAtBooking: 1500, durationMin: 45 }],
      },
      statusHistory: { create: { actorId: customers[0].id, type: "CREATED", message: "Booking requested" } },
    },
  });

  // ----------------------------------------------------------------- chats
  const conv1 = await db.conversation.create({
    data: { customerId: customers[0].id, artistId: aarohi.profileId },
  });
  await db.message.createMany({
    data: [
      { conversationId: conv1.id, senderId: customers[0].id, body: "Hi Aarohi! Love your bridal portfolio. Are you available on the 6th morning for my wedding?", createdAt: new Date(Date.now() - 36 * 3600_000) },
      { conversationId: conv1.id, senderId: aarohi.userId, body: "Hi Priya! Yes, the 6th works. I'll reach the venue by 8:30am. Share your look references when you can ✨", createdAt: new Date(Date.now() - 35 * 3600_000) },
      { conversationId: conv1.id, senderId: customers[0].id, body: "Perfect — just sent a booking request for the bridal HD package!", createdAt: new Date(Date.now() - 34 * 3600_000) },
    ],
  });

  const conv2 = await db.conversation.create({
    data: { customerId: customers[1].id, artistId: kabir.profileId },
  });
  await db.message.createMany({
    data: [
      { conversationId: conv2.id, senderId: customers[1].id, body: "Hey! Can you do a skin fade this weekend?", createdAt: new Date(Date.now() - 5 * 3600_000) },
      { conversationId: conv2.id, senderId: kabir.userId, body: "Sure 👍 I have slots Saturday evening. Book from my profile and I'll confirm.", createdAt: new Date(Date.now() - 4 * 3600_000) },
    ],
  });

  // ------------------------------------------------------------- favorites
  await db.favorite.createMany({
    data: [
      { userId: customers[0].id, artistId: aarohi.profileId },
      { userId: customers[0].id, artistId: meera.profileId },
      { userId: customers[1].id, artistId: kabir.profileId },
    ],
  });

  // ---------------------------------------------------------- notifications
  await db.notification.createMany({
    data: [
      { userId: aarohi.userId, type: "BOOKING", title: "New booking request from Priya Sharma", body: "Bridal HD makeup", link: "/bookings" },
      { userId: aarohi.userId, type: "REVIEW", title: "New 5★ review from Priya Sharma", body: "Aarohi is a magician!…", link: `/artists/${aarohi.profileId}` },
      { userId: customers[0].id, type: "BOOKING_UPDATE", title: "Booking confirmed ✅", body: "Aarohi Makeup Studio confirmed your appointment.", link: "/bookings" },
      { userId: customers[1].id, type: "MESSAGE", title: "New message from Kabir | Barber & Grooming", body: "Sure 👍 I have slots Saturday evening…", link: "/messages" },
      { userId: admin.id, type: "VERIFICATION", title: "New verification request", body: "Meera Nair submitted certificates for review.", link: "/admin/verifications" },
    ],
  });

  // ---------------------------------------------------------- report + ticket
  await db.report.create({
    data: {
      reporterId: customers[1].id,
      targetType: "REVIEW",
      targetId: b6.id,
      reason: "Spam or scam",
      details: "Testing the report flow — please dismiss.",
    },
  });

  const ticket = await db.supportTicket.create({
    data: {
      userId: customers[0].id,
      subject: "How do I reschedule a booking?",
      messages: {
        create: [
          { senderId: customers[0].id, body: "Hi! My makeup appointment time changed — how do I propose a new time without cancelling?", isStaff: false },
        ],
      },
    },
  });
  await db.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: admin.id,
      body: "Hi Priya! Open the booking, tap “Propose new time” and pick any free slot from the artist's calendar. They'll confirm and you'll get a notification. 💐",
      isStaff: true,
    },
  });

  console.log("✅ Seeded Sevika:");
  console.log(`   admin@sevika.app  / ${ADMIN_PASSWORD}  (admin console)`);
  console.log(`   aarohi@sevika.app / ${DEMO_PASSWORD}  (artist)`);
  console.log(`   priya@sevika.app  / ${DEMO_PASSWORD}  (customer)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
