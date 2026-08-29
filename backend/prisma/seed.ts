import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding NOVA demo data...");

  const passwordHash = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.upsert({
    where: { email: "aarav@nova.dev" },
    update: {},
    create: { name: "Aarav Mehta", email: "aarav@nova.dev", passwordHash },
  });

  const dev = await prisma.user.upsert({
    where: { email: "priya@nova.dev" },
    update: {},
    create: { name: "Priya Nair", email: "priya@nova.dev", passwordHash },
  });

  const project = await prisma.project.upsert({
    where: { id: "nova-demo-project" },
    update: {},
    create: {
      id: "nova-demo-project",
      name: "NOVA",
      description: "Demo e-commerce platform for the Codebase Garden hackathon build.",
      repositoryUrl: "https://github.com/example/nova",
    },
  });

  await prisma.projectMember.upsert({
    where: { userId_projectId: { userId: owner.id, projectId: project.id } },
    update: {},
    create: { userId: owner.id, projectId: project.id, role: "OWNER" },
  });

  // A deliberately varied team gives recommendations, workload and memory real signals.
  const teamSpecs = [
    ["Maya Rao", "maya@nova.dev", ["Checkout", "Payments"], ["payment", "timeout", "webhook"], 2, 14],
    ["Luis Chen", "luis@nova.dev", ["Authentication", "Profile"], ["session", "token", "validation"], 1, 18],
    ["Zara Khan", "zara@nova.dev", ["Orders", "Notifications"], ["order", "queue", "notification"], 3, 11],
    ["Noah Singh", "noah@nova.dev", ["Payments", "Orders"], ["refund", "payment", "rounding"], 1, 20],
    ["Elena Roy", "elena@nova.dev", ["Profile", "Authentication"], ["upload", "profile", "access"], 2, 9],
    ["Theo Park", "theo@nova.dev", ["Notifications", "Checkout"], ["email", "checkout", "retry"], 0, 12],
  ] as const;
  const team: Record<string, { id: string }> = { Aarav: owner, Priya: dev };
  for (const [name, email, modulesWorkedOn, skills, currentWorkload, resolutionCount] of teamSpecs) {
    const user = await prisma.user.upsert({ where: { email }, update: {}, create: { name, email, passwordHash } });
    team[name.split(" ")[0]] = user;
    await prisma.projectMember.upsert({ where: { userId_projectId: { userId: user.id, projectId: project.id } }, update: {}, create: { userId: user.id, projectId: project.id, role: "DEVELOPER" } });
    await prisma.developerProfile.upsert({ where: { userId: user.id }, update: { skills: JSON.stringify(skills), modulesWorkedOn: JSON.stringify(modulesWorkedOn), currentWorkload, resolutionCount }, create: { userId: user.id, skills: JSON.stringify(skills), modulesWorkedOn: JSON.stringify(modulesWorkedOn), currentWorkload, resolutionCount, averageResolutionHours: 18 } });
  }
  await prisma.developerProfile.upsert({ where: { userId: dev.id }, update: {}, create: { userId: dev.id, skills: JSON.stringify(["checkout", "payment", "timeout"]), modulesWorkedOn: JSON.stringify(["Checkout", "Payments"]), currentWorkload: 1, resolutionCount: 22, averageResolutionHours: 15 } });
  await prisma.projectMember.upsert({
    where: { userId_projectId: { userId: dev.id, projectId: project.id } },
    update: {},
    create: { userId: dev.id, projectId: project.id, role: "DEVELOPER" },
  });

  const moduleNames = ["Authentication", "Profile", "Checkout", "Payments", "Orders", "Notifications"];
  const modules: Record<string, { id: string }> = {};
  for (const name of moduleNames) {
    const m = await prisma.module.upsert({
      where: { projectId_name: { projectId: project.id, name } },
      update: {},
      create: { name, projectId: project.id },
    });
    modules[name] = m;
  }

  // Dependency graph: Checkout -> Payment -> Authentication, Orders -> Payment
  const dependencies: [string, string][] = [
    ["Checkout", "Payments"],
    ["Checkout", "Authentication"],
    ["Payments", "Authentication"],
    ["Orders", "Payments"],
    ["Profile", "Authentication"],
  ];
  for (const [from, to] of dependencies) {
    await prisma.moduleDependency.upsert({
      where: {
        dependentModuleId_dependencyModuleId: {
          dependentModuleId: modules[from].id,
          dependencyModuleId: modules[to].id,
        },
      },
      update: {},
      create: {
        dependentModuleId: modules[from].id,
        dependencyModuleId: modules[to].id,
      },
    });
  }

  // Demo bug: #421 Checkout timeout after payment (critical)
  const existingBug421 = await prisma.issue.findFirst({ where: { title: { contains: "Checkout timeout" } } });
  if (!existingBug421) {
    await prisma.issue.create({
      data: {
        title: "Checkout timeout after payment",
        description:
          "Checkout crashes whenever a user completes payment and the order confirmation step is reached. Appears tied to session validation after the payment redirect.",
        severity: "CRITICAL",
        priority: "URGENT",
        moduleId: modules["Checkout"].id,
        projectId: project.id,
        reporterId: dev.id,
      },
    });
  }

  // A couple more issues so module health varies across the garden.
  const extraIssues = [
    { title: "Payment webhook retried twice", module: "Payments", severity: "HIGH" },
    { title: "Order totals off by rounding error", module: "Orders", severity: "MEDIUM" },
    { title: "Profile avatar upload fails on large files", module: "Profile", severity: "LOW" },
  ];
  for (const issue of extraIssues) {
    const exists = await prisma.issue.findFirst({ where: { title: issue.title } });
    if (!exists) {
      await prisma.issue.create({
        data: {
          title: issue.title,
          description: `${issue.title} — seeded demo issue.`,
          severity: issue.severity,
          priority: "MEDIUM",
          moduleId: modules[issue.module].id,
          projectId: project.id,
          reporterId: owner.id,
        },
      });
    }
  }

  const issueSpecs = [
    ["Session token expires after payment redirect", "Authentication", "HIGH", "RESOLVED", "Luis"], ["Checkout spinner never clears", "Checkout", "HIGH", "RESOLVED", "Maya"], ["Duplicate order confirmation email", "Notifications", "MEDIUM", "RESOLVED", "Zara"], ["Refund status stays pending", "Payments", "HIGH", "IN_PROGRESS", "Noah"], ["Order export omits discounts", "Orders", "MEDIUM", "OPEN", "Zara"], ["Profile access control stale after role change", "Profile", "HIGH", "RESOLVED", "Elena"], ["Payment receipt queue delayed", "Notifications", "MEDIUM", "OPEN", "Theo"], ["Webhook signature validation rejects retries", "Payments", "CRITICAL", "SPREAD", "Maya"], ["Authentication audit log missing device", "Authentication", "LOW", "OPEN", "Luis"], ["Checkout address validation loops", "Checkout", "MEDIUM", "IN_PROGRESS", "Priya"], ["Order cancellation misses inventory release", "Orders", "HIGH", "RESOLVED", "Noah"], ["Avatar crop resets on refresh", "Profile", "LOW", "RESOLVED", "Elena"], ["Notification template renders blank locale", "Notifications", "MEDIUM", "OPEN", "Theo"], ["Payment currency conversion rounding", "Payments", "MEDIUM", "RESOLVED", "Noah"], ["Checkout tax quote timeout", "Checkout", "HIGH", "OPEN", "Maya"], ["Password reset email delayed", "Authentication", "MEDIUM", "RESOLVED", "Luis"], ["Order detail cache stale", "Orders", "LOW", "OPEN", "Zara"], ["Profile deletion leaves preferences", "Profile", "MEDIUM", "RESOLVED", "Elena"], ["Payment provider fallback unavailable", "Payments", "CRITICAL", "OPEN", "Maya"], ["Notification retry creates duplicates", "Notifications", "HIGH", "RESOLVED", "Theo"],
  ] as const;
  for (const [title, moduleName, severity, status, assignee] of issueSpecs) {
    const exists = await prisma.issue.findFirst({ where: { projectId: project.id, title } });
    if (!exists) await prisma.issue.create({ data: { title, description: `${title}. Seeded connected NOVA scenario with dependency and operational context.`, severity, priority: severity === "CRITICAL" ? "URGENT" : "HIGH", status, moduleId: modules[moduleName].id, projectId: project.id, reporterId: owner.id, assigneeId: team[assignee].id, resolvedAt: ["RESOLVED", "PREVENTED"].includes(status) ? new Date(Date.now() - 3 * 864e5) : null } });
  }
  const bug421 = await prisma.issue.findFirstOrThrow({ where: { projectId: project.id, title: { contains: "Checkout timeout" } } });
  if (!(await prisma.issueComment.count({ where: { issueId: bug421.id } }))) await prisma.issueComment.createMany({ data: [{ issueId: bug421.id, authorId: dev.id, body: "Timeout follows the payment redirect and appears after session validation." }, { issueId: bug421.id, authorId: team.Luis.id, body: "Authentication token refresh is a likely dependency to inspect." }] });
  await prisma.issueRelation.upsert({ where: { sourceIssueId_targetIssueId_type: { sourceIssueId: bug421.id, targetIssueId: (await prisma.issue.findFirstOrThrow({ where: { title: "Session token expires after payment redirect" } })).id, type: "SIMILAR" } }, update: {}, create: { sourceIssueId: bug421.id, targetIssueId: (await prisma.issue.findFirstOrThrow({ where: { title: "Session token expires after payment redirect" } })).id, type: "SIMILAR", score: .81, reason: "Shared payment redirect and session validation pattern" } });
  if (!(await prisma.notification.count())) await prisma.notification.createMany({ data: [{ userId: dev.id, title: "Critical ecosystem signal", body: "Checkout timeout after payment needs attention." }, { userId: owner.id, title: "NOVA seed ready", body: "The living ecosystem demo is ready to explore." }] });

  console.log("✅ Seed complete.");
  console.log("   Login: aarav@nova.dev / password123 (OWNER)");
  console.log("   Login: priya@nova.dev / password123 (DEVELOPER)");
  console.log(`   Project ID: ${project.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
