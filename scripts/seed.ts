import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/eventtickets";
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL ?? "admin@eventtickets.local";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Dynamic imports to avoid module registration issues
  const { User } = await import("../models/User");
  const { Organization } = await import("../models/Organization");
  const { OrgMember } = await import("../models/OrgMember");
  const { Event } = await import("../models/Event");

  // ── Superadmin ──
  let superadmin = await User.findOne({ email: SUPERADMIN_EMAIL });
  if (!superadmin) {
    superadmin = await User.create({
      email: SUPERADMIN_EMAIL,
      name: "Superadministrador",
      role: "superadmin",
      emailVerified: new Date(),
    });
    console.log("✓ Superadmin creado:", SUPERADMIN_EMAIL);
  }

  // ── Sample Organization ──
  let org = await Organization.findOne({ slug: "discoteca-demo" });
  if (!org) {
    org = await Organization.create({
      name: "Discoteca Demo",
      slug: "discoteca-demo",
      description: "Organización de demostración para eventos nocturnos",
      phone: "8888-0000",
      email: "info@discotecademo.cr",
      defaultCurrency: "CRC",
      reservationTtlMinutes: 360,
      paymentMethods: [
        {
          id: "sinpe-01",
          name: "SINPE Móvil",
          type: "mobile-payment",
          instructions: "Transferir al número 8888-0000 a nombre de Discoteca Demo",
          accountDetails: "88880000",
          requiresProof: true,
          availableInPublicPortal: true,
          isActive: true,
        },
        {
          id: "cash-01",
          name: "Efectivo",
          type: "cash",
          requiresProof: false,
          availableInPublicPortal: false,
          isActive: true,
        },
      ],
    });
    console.log("✓ Organización creada:", org.name);
  }

  // ── Org Admin ──
  let adminUser = await User.findOne({ email: "admin@discotecademo.cr" });
  if (!adminUser) {
    adminUser = await User.create({
      email: "admin@discotecademo.cr",
      name: "Admin Demo",
      role: "org_admin",
      emailVerified: new Date(),
    });

    await OrgMember.create({
      userId: adminUser._id,
      orgId: org._id,
      role: "org_admin",
      acceptedAt: new Date(),
    });
    console.log("✓ Admin de organización creado:", adminUser.email);
  }

  // ── Org Staff ──
  let staffUser = await User.findOne({ email: "staff@discotecademo.cr" });
  if (!staffUser) {
    staffUser = await User.create({
      email: "staff@discotecademo.cr",
      name: "Personal Demo",
      role: "org_staff",
      emailVerified: new Date(),
    });

    await OrgMember.create({
      userId: staffUser._id,
      orgId: org._id,
      role: "org_staff",
      acceptedAt: new Date(),
    });
    console.log("✓ Staff creado:", staffUser.email);
  }

  // ── Sample Customers ──
  const customerEmails = [
    "maria@example.com",
    "carlos@example.com",
    "ana@example.com",
  ];
  for (const email of customerEmails) {
    const exists = await User.findOne({ email });
    if (!exists) {
      await User.create({ email, name: email.split("@")[0], role: "customer", emailVerified: new Date() });
      console.log("✓ Cliente creado:", email);
    }
  }

  // ── Sample Events ──
  let djEvent = await Event.findOne({ orgId: org._id, slug: "noche-dj-2025" });
  if (!djEvent) {
    djEvent = await Event.create({
      orgId: org._id,
      title: "Noche de DJ — Temporada 2025",
      slug: "noche-dj-2025",
      description: "La mejor noche de música electrónica del año en Costa Rica",
      date: new Date("2025-12-31T21:00:00-06:00"),
      timezone: "America/Costa_Rica",
      locationName: "Discoteca Demo",
      locationAddress: "San José, Costa Rica",
      status: "published",
      sectionPrices: [
        { sectionId: "vip-01", sectionName: "VIP Frente", price: 25000, currency: "CRC" },
        { sectionId: "general-01", sectionName: "General de Pie", price: 8000, currency: "CRC" },
        { sectionId: "balcon-01", sectionName: "Balcón", price: 15000, currency: "CRC" },
      ],
      layoutJson: {
        version: 1,
        stageWidth: 800,
        stageHeight: 600,
        sections: [
          { id: "vip-01", name: "VIP Frente", type: "tables", x: 100, y: 150, width: 200, height: 150, color: "#8B5CF6" },
          { id: "general-01", name: "General de Pie", type: "general-admission", x: 350, y: 150, width: 200, height: 200, color: "#10B981", capacity: 300 },
          { id: "balcon-01", name: "Balcón", type: "seated", x: 600, y: 100, width: 150, height: 120, color: "#F59E0B" },
        ],
        labels: [],
      },
    });
    console.log("✓ Evento DJ creado:", djEvent.title);
  }

  let liveEvent = await Event.findOne({ orgId: org._id, slug: "musica-en-vivo-2025" });
  if (!liveEvent) {
    liveEvent = await Event.create({
      orgId: org._id,
      title: "Música en Vivo — Especial Fin de Año",
      slug: "musica-en-vivo-2025",
      description: "Una noche especial con bandas en vivo",
      date: new Date("2025-12-24T20:00:00-06:00"),
      timezone: "America/Costa_Rica",
      locationName: "Discoteca Demo",
      locationAddress: "San José, Costa Rica",
      status: "draft",
      sectionPrices: [
        { sectionId: "vip-02", sectionName: "VIP", price: 30000, currency: "CRC" },
        { sectionId: "mesa-01", sectionName: "Mesas", price: 18000, currency: "CRC" },
        { sectionId: "general-02", sectionName: "General", price: 10000, currency: "CRC" },
      ],
    });
    console.log("✓ Evento Live Music creado:", liveEvent.title);
  }

  console.log("\n✅ Seed completado exitosamente");
  console.log("\nCuentas de acceso:");
  console.log(`  Superadmin: ${SUPERADMIN_EMAIL}`);
  console.log("  Org Admin:  admin@discotecademo.cr");
  console.log("  Staff:      staff@discotecademo.cr");
  console.log("  Clientes:   maria@example.com, carlos@example.com, ana@example.com");
  console.log("\nOrganización:");
  console.log(`  Dashboard: http://localhost:4000/org/discoteca-demo`);
  console.log(`  Superadmin: http://localhost:4000/superadmin`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
