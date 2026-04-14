import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/eventtickets";

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const { User } = await import("../models/User");
  const { Organization } = await import("../models/Organization");
  const { OrgMember } = await import("../models/OrgMember");
  const { Event } = await import("../models/Event");

  const pw = async (plain: string) => bcrypt.hash(plain, 10);

  // ── Users ──
  const users: { email: string; name: string; role: string; password: string }[] = [
    { email: "superadmin@entradascr.com", name: "Super Admin", role: "superadmin", password: "Admin1234!" },
    { email: "admin@discotecademo.cr", name: "Admin Demo", role: "org_admin", password: "Admin1234!" },
    { email: "staff@discotecademo.cr", name: "Personal Demo", role: "org_staff", password: "Staff1234!" },
    { email: "maria@example.com", name: "María García", role: "customer", password: "Test1234!" },
    { email: "carlos@example.com", name: "Carlos Rodríguez", role: "customer", password: "Test1234!" },
    { email: "ana@example.com", name: "Ana Mora", role: "customer", password: "Test1234!" },
  ];

  const userDocs: Record<string, any> = {};
  for (const u of users) {
    let doc = await User.findOne({ email: u.email });
    const hash = await pw(u.password);
    if (!doc) {
      doc = await User.create({ email: u.email, name: u.name, role: u.role, emailVerified: new Date(), passwordHash: hash });
      console.log("✓ User created:", u.email, "(password:", u.password + ")");
    } else {
      await User.updateOne({ _id: doc._id }, { passwordHash: hash });
      console.log("✓ User password updated:", u.email);
    }
    userDocs[u.email] = doc;
  }

  // ── Organization ──
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
        { id: "sinpe-01", name: "SINPE Móvil", type: "mobile-payment", instructions: "Transferir al 8888-0000 a nombre de Discoteca Demo", accountDetails: "88880000", requiresProof: true, availableInPublicPortal: true, isActive: true },
        { id: "cash-01", name: "Efectivo en puerta", type: "cash", requiresProof: false, availableInPublicPortal: false, isActive: true },
      ],
    });
    console.log("✓ Organization created:", org.name);
  }

  // ── Memberships ──
  for (const [email, role] of [["admin@discotecademo.cr", "org_admin"], ["staff@discotecademo.cr", "org_staff"]]) {
    const u = userDocs[email];
    const exists = await OrgMember.findOne({ userId: u._id, orgId: org._id });
    if (!exists) {
      await OrgMember.create({ userId: u._id, orgId: org._id, role, acceptedAt: new Date() });
      console.log("✓ Member added:", email, role);
    }
  }

  // ── Events ──

  // Event 1: Big DJ night — numbered seated + general admission + VIP tables
  await upsertEvent(Event, {
    orgId: org._id,
    title: "Noche de DJ — Año Nuevo 2026",
    slug: "noche-dj-2026",
    description: "La mejor noche de música electrónica del año. DJs internacionales en vivo toda la noche.",
    date: new Date("2026-12-31T21:00:00-06:00"),
    timezone: "America/Costa_Rica",
    locationName: "Centro de Eventos Nacional",
    locationAddress: "Av. Central, San José, Costa Rica",
    status: "published",
    sectionPrices: [
      { sectionId: "vip-01", sectionName: "VIP — Mesas Frente", price: 45000, currency: "CRC" },
      { sectionId: "butacas-01", sectionName: "Butacas Numeradas", price: 22000, currency: "CRC" },
      { sectionId: "general-01", sectionName: "General de Pie", price: 9000, currency: "CRC" },
    ],
    layoutJson: {
      version: 1, stageWidth: 900, stageHeight: 650,
      sections: [
        { id: "vip-01", name: "VIP — Mesas Frente", type: "tables", x: 50, y: 200, width: 250, height: 180, color: "#8B5CF6" },
        { id: "butacas-01", name: "Butacas Numeradas", type: "seated", x: 330, y: 150, width: 280, height: 220, color: "#3B82F6", rows: 8, cols: 10 },
        { id: "general-01", name: "General de Pie", type: "general-admission", x: 640, y: 150, width: 200, height: 300, color: "#10B981", capacity: 500 },
      ],
      labels: [{ id: "stage-1", text: "ESCENARIO", x: 300, y: 50, fontSize: 18 }],
    },
  });

  // Event 2: Live music concert — balcony + floor + meet & greet
  await upsertEvent(Event, {
    orgId: org._id,
    title: "Concierto en Vivo — Bandas Ticas 2026",
    slug: "concierto-bandas-ticas-2026",
    description: "Las mejores bandas costarricenses en una noche épica. Incluye Meet & Greet VIP.",
    date: new Date("2026-06-15T19:00:00-06:00"),
    timezone: "America/Costa_Rica",
    locationName: "Teatro Nacional",
    locationAddress: "Plaza de la Cultura, San José",
    status: "published",
    sectionPrices: [
      { sectionId: "meet-greet", sectionName: "Meet & Greet VIP", price: 75000, currency: "CRC" },
      { sectionId: "balcon-01", sectionName: "Palco / Balcón", price: 35000, currency: "CRC" },
      { sectionId: "piso-01", sectionName: "Piso General", price: 15000, currency: "CRC" },
    ],
    layoutJson: {
      version: 1, stageWidth: 800, stageHeight: 600,
      sections: [
        { id: "meet-greet", name: "Meet & Greet VIP", type: "tables", x: 580, y: 20, width: 180, height: 120, color: "#F59E0B" },
        { id: "balcon-01", name: "Palco / Balcón", type: "seated", x: 100, y: 30, width: 450, height: 100, color: "#EC4899", rows: 3, cols: 15 },
        { id: "piso-01", name: "Piso General", type: "general-admission", x: 100, y: 180, width: 600, height: 350, color: "#6366F1", capacity: 800 },
      ],
      labels: [{ id: "stage-2", text: "ESCENARIO", x: 280, y: 560, fontSize: 18 }],
    },
  });

  // Event 3: Sports event — multiple numbered sections around a field
  await upsertEvent(Event, {
    orgId: org._id,
    title: "Partido de Fútbol — Clásico Nacional",
    slug: "clasico-nacional-2026",
    description: "El clásico más esperado del año. Secciones Norte, Sur, Este y Oeste.",
    date: new Date("2026-03-20T18:00:00-06:00"),
    timezone: "America/Costa_Rica",
    locationName: "Estadio Nacional",
    locationAddress: "La Sabana, San José",
    status: "published",
    sectionPrices: [
      { sectionId: "palco-est", sectionName: "Palco Este", price: 40000, currency: "CRC" },
      { sectionId: "norte-01", sectionName: "Gradería Norte", price: 12000, currency: "CRC" },
      { sectionId: "sur-01", sectionName: "Gradería Sur", price: 12000, currency: "CRC" },
      { sectionId: "este-01", sectionName: "Gradería Este", price: 18000, currency: "CRC" },
      { sectionId: "oeste-01", sectionName: "Gradería Oeste", price: 18000, currency: "CRC" },
    ],
    layoutJson: {
      version: 1, stageWidth: 900, stageHeight: 700,
      sections: [
        { id: "palco-est", name: "Palco Este", type: "seated", x: 600, y: 250, width: 180, height: 200, color: "#F59E0B", rows: 5, cols: 10 },
        { id: "norte-01", name: "Gradería Norte", type: "general-admission", x: 250, y: 30, width: 400, height: 120, color: "#EF4444", capacity: 3000 },
        { id: "sur-01", name: "Gradería Sur", type: "general-admission", x: 250, y: 550, width: 400, height: 120, color: "#3B82F6", capacity: 3000 },
        { id: "este-01", name: "Gradería Este", type: "seated", x: 680, y: 180, width: 180, height: 340, color: "#10B981", rows: 10, cols: 8 },
        { id: "oeste-01", name: "Gradería Oeste", type: "seated", x: 40, y: 180, width: 180, height: 340, color: "#8B5CF6", rows: 10, cols: 8 },
      ],
      labels: [{ id: "field", text: "CANCHA", x: 350, y: 320, fontSize: 22 }],
    },
  });

  // Event 4: Draft event (not published)
  await upsertEvent(Event, {
    orgId: org._id,
    title: "Festival Privado — Prueba de Sistema",
    slug: "festival-privado-prueba",
    description: "Evento de prueba en modo borrador.",
    date: new Date("2026-09-01T20:00:00-06:00"),
    timezone: "America/Costa_Rica",
    locationName: "Finca Privada",
    locationAddress: "Heredia, Costa Rica",
    status: "draft",
    sectionPrices: [
      { sectionId: "gen-draft", sectionName: "General", price: 5000, currency: "CRC" },
    ],
  });

  console.log("\n✅ Seed completed");
  console.log("\n=== TEST CREDENTIALS ===");
  console.log("Superadmin:  superadmin@entradascr.com  / Admin1234!");
  console.log("Org Admin:   admin@discotecademo.cr     / Admin1234!");
  console.log("Org Staff:   staff@discotecademo.cr     / Staff1234!");
  console.log("Customer 1:  maria@example.com           / Test1234!");
  console.log("Customer 2:  carlos@example.com          / Test1234!");
  console.log("Customer 3:  ana@example.com             / Test1234!");
  console.log("\n=== URLS ===");
  console.log("Home:       http://localhost:4000/");
  console.log("Events:     http://localhost:4000/events");
  console.log("Org Admin:  http://localhost:4000/org/discoteca-demo");
  console.log("Superadmin: http://localhost:4000/superadmin");

  await mongoose.disconnect();
}

async function upsertEvent(EventModel: any, data: any) {
  const existing = await EventModel.findOne({ orgId: data.orgId, slug: data.slug });
  if (!existing) {
    await EventModel.create(data);
    console.log("✓ Event created:", data.title);
  } else {
    await EventModel.updateOne({ _id: existing._id }, { $set: data });
    console.log("✓ Event updated:", data.title);
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
