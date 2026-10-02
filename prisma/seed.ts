import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Ticket9ja@687", 12);
  const staffPassword = await bcrypt.hash("pass1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "Ticket9ja@gmail.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "Ticket9ja@gmail.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@ticketgate.local" },
    update: {},
    create: {
      name: "Gate Staff",
      email: "staff@ticketgate.local",
      passwordHash: staffPassword,
      role: "STAFF",
    },
  });

  const event = await prisma.event.upsert({
    where: { id: "seed-event-1" },
    update: {},
    create: {
      id: "seed-event-1",
      name: "Lagos Music Festival",
      venue: "Eko Convention Centre",
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
  });

  await prisma.staffEvent.upsert({
    where: { staffId_eventId: { staffId: staff.id, eventId: event.id } },
    update: {},
    create: { staffId: staff.id, eventId: event.id },
  });

  // Seed the same tickets the mock provider knows about, so a fresh dev
  // database and the mock provider agree until a real sync/verify call
  // reconciles them.
  await prisma.ticket.upsert({
    where: { ticketCode: "TKT6AADE8AEA15A2" },
    update: {},
    create: {
      ticketCode: "TKT6AADE8AEA15A2",
      eventId: event.id,
      category: "Early Bird",
      customerName: "Ayotunde Ayotunde",
      customerEmail: "ayotunde@example.com",
      amount: 7300,
      quantity: 1,
      orderReference: "EVT-LB0CUTWK9O8Q",
      paymentStatus: "SUCCESSFUL",
      ticketStatus: "UNUSED",
    },
  });

  console.log("Seeded:");
  console.log(`  Admin login: admin@ticketgate.local / ChangeMe123!`);
  console.log(`  Staff login: staff@ticketgate.local / ChangeMe123!`);
  console.log(`  Event: ${event.name} (${event.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
