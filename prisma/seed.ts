import { PrismaClient, Role, ContactStatus, ContactSource, DealStage, ActivityType, TaskPriority, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Pseudo-Random Number Generator with fixed seed for reproducibility
function createPrng(seed: number = 42) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const random = createPrng(42);

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear existing records in reverse dependency order
  await prisma.activity.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.modelVersion.deleteMany({});

  console.log("🧹 Cleaned existing tables.");

  // 1. Create Users
  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);
  const repPasswordHash = await bcrypt.hash("Rep@123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Aditi Rao",
      email: "admin@akshara.test",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const rep1 = await prisma.user.create({
    data: {
      name: "Rahul Sharma",
      email: "rahul.sharma@akshara.test",
      passwordHash: repPasswordHash,
      role: Role.SALES_REP,
    },
  });

  const rep2 = await prisma.user.create({
    data: {
      name: "Priya Patel",
      email: "priya.patel@akshara.test",
      passwordHash: repPasswordHash,
      role: Role.SALES_REP,
    },
  });

  const reps = [rep1, rep2];
  const allUsers = [admin, rep1, rep2];
  console.log(`👤 Created 3 users: 1 Admin, 2 Sales Reps.`);

  // 2. Create 10 Indian Companies
  const companyData = [
    { name: "Infosys Techworks", industry: "IT Services", city: "Bengaluru", website: "https://infosystech.in", phone: "+91 80 2852 0261" },
    { name: "Tata Steel & Motors", industry: "Manufacturing", city: "Jamshedpur", website: "https://tatasteel.com", phone: "+91 657 664 4000" },
    { name: "HDFC FinServe Labs", industry: "FinTech", city: "Mumbai", website: "https://hdfcfin.com", phone: "+91 22 6652 1000" },
    { name: "Apollo Health Systems", industry: "Healthcare", city: "Chennai", website: "https://apollohealth.org", phone: "+91 44 2829 0200" },
    { name: "Mahindra Logistics Solutions", industry: "Logistics", city: "Pune", website: "https://mahindralogistics.com", phone: "+91 20 6608 5000" },
    { name: "Reliance Retail Ventures", industry: "Retail", city: "Navi Mumbai", website: "https://relianceretail.com", phone: "+91 22 3555 5000" },
    { name: "Zomato Commerce Tech", industry: "E-Commerce", city: "Gurugram", website: "https://zomatotech.in", phone: "+91 124 456 7890" },
    { name: "Larsen & Toubro Infra", industry: "Infrastructure", city: "Mumbai", website: "https://ltinfra.com", phone: "+91 22 6752 5656" },
    { name: "Byju's Learning Network", industry: "EdTech", city: "Bengaluru", website: "https://byjusnet.in", phone: "+91 80 4567 8901" },
    { name: "Airtel Cloud Enterprise", industry: "Telecommunications", city: "New Delhi", website: "https://airtelenterprise.com", phone: "+91 11 4666 6100" },
  ];

  const companies = [];
  for (let i = 0; i < companyData.length; i++) {
    const comp = await prisma.company.create({
      data: {
        ...companyData[i],
        ownerId: reps[i % reps.length].id,
      },
    });
    companies.push(comp);
  }
  console.log(`🏢 Created ${companies.length} Indian companies.`);

  // 3. Create 60 Contacts
  const firstNames = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
    "Ananya", "Diya", "Saanvi", "Arya", "Aadhya", "Kiara", "Myra", "Riya", "Sneha", "Pooja",
    "Vikram", "Rohan", "Karthik", "Rajesh", "Suresh", "Neha", "Amit", "Divya", "Manoj", "Kavita",
    "Deepak", "Sunita", "Sanjay", "Rekha", "Nikhil", "Meera", "Varun", "Tanvi", "Gaurav", "Shweta",
    "Manish", "Bhavna", "Alok", "Pallavi", "Tarun", "Preeti", "Kunal", "Simran", "Abhishek", "Smriti",
    "Harsh", "Swati", "Naveen", "Archana", "Prateek", "Geeta", "Vikas", "Rashmi", "Sachin", "Monika"
  ];

  const lastNames = [
    "Sharma", "Verma", "Patel", "Iyer", "Nair", "Reddy", "Gupta", "Rao", "Mehta", "Joshi",
    "Das", "Singh", "Mukherjee", "Kulkarni", "Chatterjee", "Chopra", "Bose", "Menon", "Deshmukh", "Nambiar"
  ];

  const jobTitles = [
    "Chief Technology Officer", "VP of Engineering", "Head of Procurement",
    "Operations Director", "VP of Sales", "IT Infrastructure Director",
    "Enterprise Solutions Lead", "Digital Transformation Head", "Managing Director"
  ];

  const sources = [
    ContactSource.WEBSITE, ContactSource.REFERRAL, ContactSource.COLD_CALL,
    ContactSource.SOCIAL, ContactSource.EVENT, ContactSource.OTHER
  ];

  const statuses = [ContactStatus.LEAD, ContactStatus.PROSPECT, ContactStatus.CUSTOMER, ContactStatus.CHURNED];

  const contacts = [];
  for (let i = 0; i < 60; i++) {
    const firstName = firstNames[i];
    const lastName = lastNames[i % lastNames.length];
    const company = companies[i % companies.length];
    const owner = company.ownerId === rep1.id ? rep1 : rep2;

    const contact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.website?.replace("https://", "").replace("http://", "") || "domain.test"}`,
        phone: `+91 ${randomInt(90000, 99999)} ${randomInt(10000, 99999)}`,
        jobTitle: randomChoice(jobTitles),
        companyId: company.id,
        ownerId: owner.id,
        source: randomChoice(sources),
        status: randomChoice(statuses),
      },
    });
    contacts.push(contact);
  }
  console.log(`👥 Created ${contacts.length} Contacts.`);

  // 4. Create Deals & Activities
  // We need ~200 closed deals + ~40 open deals = 240 deals total.
  // Outcomes for closed deals must be correlated with features for ML learnability (~70%+ accuracy).
  const dealTitles = [
    "Enterprise Cloud Migration", "Core Banking Modernization", "Supply Chain Analytics Platform",
    "Omnichannel CRM Implementation", "Security Ops Suite & SIEM", "Automated Billing & Invoicing",
    "Data Lakehouse Architecture", "AI Customer Support Bot", "Fleet Telematics Integration",
    "Digital Patient Record Portal", "Warehouse Automation System", "Payment Gateway Integration",
    "Zero Trust Network Deployment", "ERP Next Phase Rollout", "Microservices Container Platform"
  ];

  const lostReasons = [
    "Competitor offered 30% discount", "Budget freeze for current fiscal year",
    "Internal team decided to build in-house", "Project indefinitely postponed",
    "Lack of executive sponsorship from CFO", "Feature gaps in custom reporting"
  ];

  const now = new Date("2026-10-28T12:00:00Z");
  let totalActivities = 0;

  // Let's generate 200 Closed Deals (WON or LOST)
  console.log("💼 Generating 200 closed deals with learnable correlations...");
  for (let i = 0; i < 200; i++) {
    const contact = contacts[i % contacts.length];
    const company = companies.find((c) => c.id === contact.companyId) || companies[0];
    const ownerId = contact.ownerId;

    // Deal created between 365 and 30 days ago
    const daysAgoCreated = randomInt(30, 365);
    const createdAt = new Date(now.getTime() - daysAgoCreated * 24 * 60 * 60 * 1000);
    // Closed between createdAt and (createdAt + 60 days)
    const durationDays = randomInt(10, Math.min(60, daysAgoCreated - 1));
    const closedAt = new Date(createdAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const dealValue = randomInt(250000, 7500000); // ₹2.5 Lakh to ₹75 Lakh

    // Feature drivers for synthetic correlation:
    // 1. Referral source gives positive boost
    const isReferral = contact.source === ContactSource.REFERRAL;
    // 2. High-momentum deals have more meetings & recent activities
    const highInterest = random() > 0.45;
    const meetingCount = highInterest ? randomInt(3, 8) : randomInt(0, 2);
    const totalActivityCount = meetingCount + (highInterest ? randomInt(4, 10) : randomInt(1, 4));

    // Latent score with noise
    const sourceScore = isReferral ? 1.2 : (contact.source === ContactSource.COLD_CALL ? -0.6 : 0.2);
    const meetingScore = meetingCount * 0.45;
    const activityScore = totalActivityCount * 0.15;
    const valueFactor = Math.log(dealValue) * 0.1;
    const noise = (random() - 0.5) * 1.6;

    const latentScore = sourceScore + meetingScore + activityScore + valueFactor + noise;
    const isWon = latentScore >= 3.2;

    const stage = isWon ? DealStage.WON : DealStage.LOST;
    const lostReason = isWon ? null : randomChoice(lostReasons);

    const deal = await prisma.deal.create({
      data: {
        title: `${company.name} - ${randomChoice(dealTitles)}`,
        value: dealValue,
        stage,
        expectedCloseDate: closedAt,
        closedAt,
        lostReason,
        contactId: contact.id,
        companyId: company.id,
        ownerId,
        createdAt,
        updatedAt: closedAt,
      },
    });

    // Create activities for this deal
    for (let a = 0; a < totalActivityCount; a++) {
      const isMeeting = a < meetingCount;
      const type = isMeeting
        ? ActivityType.MEETING
        : randomChoice([ActivityType.CALL, ActivityType.EMAIL, ActivityType.NOTE]);

      // Distribute activities between createdAt and closedAt
      const actTime = new Date(createdAt.getTime() + (random() * durationDays) * 24 * 60 * 60 * 1000);
      await prisma.activity.create({
        data: {
          type,
          subject: isMeeting ? "Executive Technical Review & Proposal" : `${type} touchpoint with ${contact.firstName}`,
          description: `Detailed discussion covering SLA requirements, integration roadmap, and commercial viability.`,
          occurredAt: actTime,
          contactId: contact.id,
          dealId: deal.id,
          userId: ownerId,
          createdAt: actTime,
        },
      });
      totalActivities++;
    }
  }

  // Generate 40 Open Deals
  console.log("📊 Generating 40 open deals across stages...");
  const openStages = [DealStage.NEW, DealStage.CONTACTED, DealStage.PROPOSAL, DealStage.NEGOTIATION];

  for (let i = 0; i < 40; i++) {
    const contact = contacts[(i + 15) % contacts.length];
    const company = companies.find((c) => c.id === contact.companyId) || companies[0];
    const ownerId = contact.ownerId;
    const stage = openStages[i % openStages.length];

    const daysAgoCreated = randomInt(5, 60);
    const createdAt = new Date(now.getTime() - daysAgoCreated * 24 * 60 * 60 * 1000);
    // Expected to close in future (next 10 to 75 days)
    const expectedCloseDate = new Date(now.getTime() + randomInt(10, 75) * 24 * 60 * 60 * 1000);
    const dealValue = randomInt(300000, 6000000);

    const deal = await prisma.deal.create({
      data: {
        title: `${company.name} - ${randomChoice(dealTitles)}`,
        value: dealValue,
        stage,
        expectedCloseDate,
        contactId: contact.id,
        companyId: company.id,
        ownerId,
        createdAt,
        updatedAt: createdAt,
      },
    });

    // Open deals have some activities
    const numActs = randomInt(2, 6);
    for (let a = 0; a < numActs; a++) {
      const type = randomChoice([ActivityType.CALL, ActivityType.EMAIL, ActivityType.MEETING, ActivityType.NOTE]);
      const actTime = new Date(createdAt.getTime() + randomInt(1, Math.max(1, daysAgoCreated - 1)) * 24 * 60 * 60 * 1000);
      await prisma.activity.create({
        data: {
          type,
          subject: `${type} update regarding ${deal.title}`,
          description: `Followed up with ${contact.firstName} ${contact.lastName} regarding stage progression and next steps.`,
          occurredAt: actTime,
          contactId: contact.id,
          dealId: deal.id,
          userId: ownerId,
          createdAt: actTime,
        },
      });
      totalActivities++;
    }
  }

  console.log(`📑 Created 240 deals (200 closed, 40 open) and ${totalActivities} activities.`);

  // 5. Create 30 Follow-Up Tasks
  console.log("⏰ Creating 30 follow-up tasks...");
  const taskTitles = [
    "Send updated Master Service Agreement & commercial terms",
    "Follow up on pending security compliance questionnaire",
    "Schedule architecture deep-dive demo with CTO",
    "Verify GSTIN number and company billing address",
    "Coordinate with legal team regarding liability cap redlines",
    "Share customer case studies from Banking & FinTech sector",
    "Executive sync with VP of Engineering for Q4 delivery",
    "Review customized pricing tier for enterprise deployment",
    "Check customer reference check feedback with client",
    "Send onboarding checklist and API token setup documentation"
  ];

  const deals = await prisma.deal.findMany({ take: 30 });

  for (let i = 0; i < 30; i++) {
    const deal = deals[i % deals.length];
    const isDone = i % 3 === 0;
    // Some tasks overdue (-5 to -1 days), some due today/this week (+0 to +14 days)
    const dueOffsetDays = i < 8 ? -randomInt(1, 10) : randomInt(0, 15);
    const dueDate = new Date(now.getTime() + dueOffsetDays * 24 * 60 * 60 * 1000);

    await prisma.task.create({
      data: {
        title: taskTitles[i % taskTitles.length],
        description: `Ensure timely resolution for ${deal.title}. Contact person is notified.`,
        dueDate,
        priority: randomChoice([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH]),
        status: isDone ? TaskStatus.DONE : TaskStatus.OPEN,
        contactId: deal.contactId,
        dealId: deal.id,
        assigneeId: deal.ownerId,
      },
    });
  }
  console.log("✅ Created 30 tasks.");

  console.log("\n🎉 Database seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
