import AdmZip from "adm-zip";
import { prisma } from "../utils/prismaClient";
import { computeModuleHealth } from "./riskAssessmentService";
import { ApiError } from "../middleware/errorHandler";

export interface AnalyzedBug {
  title: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  moduleName: string;
  filePath: string;
  lineNumber?: number;
  evidence: string[];
  rootCause: string;
  confidence: number;
  preventions: string[];
  recommendedFix: string;
}

export interface DiscoveredModule {
  name: string;
  fileCount: number;
  files: string[];
  dependsOn: string[];
}

export interface PlantProjectResult {
  projectId: string;
  projectName: string;
  description: string;
  repositoryUrl?: string;
  summary: {
    totalBugs: number;
    bySeverity: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    };
    moduleCount: number;
    modules: {
      name: string;
      healthScore: number;
      level: string;
      bugCount: number;
    }[];
    healthScore: number;
    mostCriticalRoot: string;
    highestImpactBug: string;
    stages: string[];
    scanDurationMs: number;
  };
}

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".github",
  ".vscode",
  ".idea",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".cache",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
]);

const ALLOWED_EXTENSIONS = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "py",
  "go",
  "java",
  "rb",
  "php",
  "html",
  "css",
  "scss",
  "json",
  "yaml",
  "yml",
  "env",
  "sql",
  "prisma",
  "md",
]);

/** Safely extracts text files from a ZIP buffer in memory */
export function extractZipFiles(zipBuffer: Buffer): Map<string, string> {
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch {
    throw new ApiError(400, "Please upload a valid .zip codebase archive");
  }
  const zipEntries = zip.getEntries();
  const fileMap = new Map<string, string>();

  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;

    // Normalize path
    let rawPath = entry.entryName.replace(/\\/g, "/");
    // Strip root wrapper directory if present (e.g. from GitHub zipball: owner-repo-hash/...)
    const pathParts = rawPath.split("/").filter(Boolean);
    if (pathParts.length > 1 && pathParts[0].includes("-")) {
      rawPath = pathParts.slice(1).join("/");
    }

    const segments = rawPath.split("/");
    if (segments.some((segment) => segment === ".." || segment === ".")) {
      continue;
    }
    if (segments.some((s) => IGNORED_DIRS.has(s) || s.startsWith("."))) {
      // allow .env / .env.example
      if (!rawPath.endsWith(".env") && !rawPath.endsWith(".env.example")) {
        continue;
      }
    }

    const ext = rawPath.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;

    try {
      const content = entry.getData().toString("utf8");
      // Limit file size to 2MB per file for safety
      if (content.length <= 2 * 1024 * 1024) {
        fileMap.set(rawPath, content);
      }
    } catch {
      // Ignore binary / non-utf8 entries
    }
  }

  if (fileMap.size === 0) {
    throw new ApiError(400, "No readable source files found in the provided archive");
  }

  return fileMap;
}

/** Fetches a public GitHub repository zipball */
export async function fetchGithubRepo(repoUrl: string, branch?: string): Promise<{ buffer: Buffer; repoName: string }> {
  let cleanUrl = repoUrl.trim();
  if (cleanUrl.endsWith(".git")) cleanUrl = cleanUrl.slice(0, -4);
  cleanUrl = cleanUrl.replace(/^git\+/, "");

  const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new ApiError(400, "Please provide a valid GitHub repository URL (e.g. https://github.com/owner/repo)");
  }

  const owner = match[1];
  const repo = match[2].split("#")[0].split("?")[0];
  const targetBranch = branch || "main";

  // Try GitHub zipball URLs
  const candidateUrls = [
    `https://api.github.com/repos/${owner}/${repo}/zipball/${targetBranch}`,
    `https://api.github.com/repos/${owner}/${repo}/zipball/master`,
    `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${targetBranch}`,
    `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/master`,
  ];

  let lastError = "Could not fetch repository archive";
  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Nova-Garden-Codebase-Scanner",
          Accept: "application/vnd.github.v3+json, application/octet-stream",
        },
      });

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        if (buffer.length > 0) {
          return { buffer, repoName: repo };
        }
      } else {
        lastError = `GitHub API returned ${res.status}: ${res.statusText}`;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new ApiError(400, `Failed to retrieve repository from ${repoUrl} (${lastError})`);
}

/** Discovers logical modules and maps root dependencies from file paths and imports */
export function discoverModulesAndRoots(files: Map<string, string>): {
  modules: Map<string, DiscoveredModule>;
  dependencies: [string, string][];
} {
  const moduleMap = new Map<string, DiscoveredModule>();
  const moduleNames = new Set<string>();

  // Determine top-level architecture
  const filePaths = [...files.keys()];

  // Predefined recognizable folders
  const KNOWN_MODULE_KEYWORDS: Record<string, string> = {
    auth: "Authentication & Security",
    user: "User Management & Profile",
    login: "Authentication & Security",
    payment: "Payments & Billing",
    checkout: "Checkout & Cart",
    cart: "Checkout & Cart",
    order: "Orders & Inventory",
    product: "Catalog & Products",
    item: "Catalog & Products",
    notification: "Notifications & Alerts",
    email: "Notifications & Alerts",
    api: "API & Routing",
    route: "API & Routing",
    controller: "Controllers & Handlers",
    service: "Services & Logic",
    database: "Database & Models",
    db: "Database & Models",
    model: "Database & Models",
    frontend: "Frontend UI",
    client: "Frontend UI",
    ui: "UI Components",
    component: "UI Components",
    backend: "Backend Core",
    server: "Server & Infrastructure",
    config: "Config & Environment",
    util: "Utilities & Helpers",
  };

  // Assign files to modules
  for (const [filePath, content] of files.entries()) {
    const lower = filePath.toLowerCase();
    let assignedModule: string | null = null;

    // Check keywords
    for (const [kw, modName] of Object.entries(KNOWN_MODULE_KEYWORDS)) {
      if (lower.includes(`/${kw}`) || lower.startsWith(`${kw}/`) || lower.includes(`${kw}.`)) {
        assignedModule = modName;
        break;
      }
    }

    // Top-level folder fallback
    if (!assignedModule) {
      const top = filePath.split("/")[0];
      if (top && top.length > 2 && !top.includes(".")) {
        assignedModule = top.charAt(0).toUpperCase() + top.slice(1);
      }
    }

    // Default architectural fallback
    if (!assignedModule) {
      if (lower.endsWith(".tsx") || lower.endsWith(".jsx") || lower.endsWith(".html") || lower.endsWith(".css")) {
        assignedModule = "UI & Components";
      } else if (lower.includes("route") || lower.includes("controller") || lower.includes("api")) {
        assignedModule = "API & Routing";
      } else if (lower.includes("service") || lower.includes("logic")) {
        assignedModule = "Services & Core Logic";
      } else if (lower.includes("schema") || lower.includes("db") || lower.includes("model") || lower.endsWith(".prisma") || lower.endsWith(".sql")) {
        assignedModule = "Database & Data Layer";
      } else {
        assignedModule = "Core Infrastructure";
      }
    }

    if (!moduleMap.has(assignedModule)) {
      moduleMap.set(assignedModule, {
        name: assignedModule,
        fileCount: 0,
        files: [],
        dependsOn: [],
      });
    }

    const mod = moduleMap.get(assignedModule)!;
    mod.fileCount++;
    mod.files.push(filePath);
    moduleNames.add(assignedModule);
  }

  // Map dependencies based on import statements
  const dependencies: [string, string][] = [];
  const depSet = new Set<string>();

  const modulesList = [...moduleMap.values()];
  for (const mod of modulesList) {
    for (const filePath of mod.files) {
      const content = files.get(filePath) || "";
      // Check import / require statements
      for (const targetMod of modulesList) {
        if (targetMod.name === mod.name) continue;

        const targetKeywords = targetMod.name.toLowerCase().split(/[\s&]+/);
        const hasImport = targetKeywords.some((kw) => kw.length > 3 && content.toLowerCase().includes(kw));

        if (hasImport) {
          const key = `${mod.name}::${targetMod.name}`;
          if (!depSet.has(key)) {
            depSet.add(key);
            dependencies.push([mod.name, targetMod.name]);
            if (!mod.dependsOn.includes(targetMod.name)) {
              mod.dependsOn.push(targetMod.name);
            }
          }
        }
      }
    }
  }

  return { modules: moduleMap, dependencies };
}

/** Static bug detection rules running across codebase text files */
export function detectBugs(
  files: Map<string, string>,
  modules: Map<string, DiscoveredModule>
): AnalyzedBug[] {
  const bugs: AnalyzedBug[] = [];

  function getModuleName(filePath: string): string {
    for (const mod of modules.values()) {
      if (mod.files.includes(filePath)) return mod.name;
    }
    return modules.keys().next().value || "Core Infrastructure";
  }

  for (const [filePath, content] of files.entries()) {
    const lines = content.split("\n");
    const moduleName = getModuleName(filePath);

    // Rule 1: Hardcoded Secrets / Credentials (CRITICAL)
    const secretMatches = [
      { pattern: /(?:api_?key|secret|password|auth_?token|jwt_?secret)\s*[:=]\s*["']([^"'\s]{16,})["']/i, name: "Hardcoded API Key / Secret Token" },
      { pattern: /sk-[a-zA-Z0-9_-]{20,}/, name: "Exposed OpenAI / Secret API Key" },
      { pattern: /ghp_[a-zA-Z0-9]{20,}/, name: "Exposed GitHub Personal Access Token" },
      { pattern: /-----BEGIN (?:RSA )?PRIVATE KEY-----/, name: "Exposed Private Key in Source Code" },
    ];

    for (const rule of secretMatches) {
      lines.forEach((line, idx) => {
        if (rule.pattern.test(line) && !line.includes("process.env") && !line.includes("example") && !filePath.includes(".example")) {
          bugs.push({
            title: `Hardcoded secret exposed in ${filePath}`,
            description: `Potential confidential credential or token (${rule.name}) is declared as a plain-text literal in source code rather than loaded from environment variables.`,
            severity: "CRITICAL",
            priority: "URGENT",
            moduleName,
            filePath,
            lineNumber: idx + 1,
            evidence: [`File: ${filePath}:${idx + 1}`, `Code line: ${line.trim().slice(0, 80)}...`],
            rootCause: "Credentials committed directly to source control instead of environment secrets store.",
            confidence: 0.96,
            preventions: [
              "Move secret to secure environment configuration (.env / secret manager)",
              "Add pre-commit secret detection hook",
              "Rotate the exposed credential immediately",
            ],
            recommendedFix: "Replace literal with process.env.SECRET_NAME and ensure .env is gitignored.",
          });
        }
      });
    }

    // Rule 2: SQL / Query Injection Vulnerability (CRITICAL)
    lines.forEach((line, idx) => {
      if (
        (/\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)\b.*\$\{/i.test(line) ||
          /\b(query|execute)\s*\(\s*`.*\$\{/i.test(line)) &&
        !line.includes("prisma") &&
        !line.includes("prepare")
      ) {
        bugs.push({
          title: `Potential SQL Injection in ${filePath}`,
          description: `Raw SQL statement constructed via dynamic string interpolation (\`\${...}\`). Untrusted parameters can alter the query execution structure.`,
          severity: "CRITICAL",
          priority: "URGENT",
          moduleName,
          filePath,
          lineNumber: idx + 1,
          evidence: [`File: ${filePath}:${idx + 1}`, `Interpolated query: ${line.trim().slice(0, 80)}...`],
          rootCause: "Unparameterized raw SQL query dynamically constructed with string interpolation.",
          confidence: 0.91,
          preventions: [
            "Use parameterized prepared statements or typed ORM methods",
            "Enable automated static SAST code analysis in CI",
            "Add integration test verifying quote escaping and malicious payloads",
          ],
          recommendedFix: "Convert query to parameterized placeholders (e.g. $1, ? or Prisma typed client).",
        });
      }
    });

    // Rule 3: Unhandled Async / Promise Error in Route / Handler (HIGH)
    if (content.includes("async ") && (content.includes("router.") || content.includes("app.") || content.includes("export async function"))) {
      let inAsync = false;
      let hasTry = false;
      lines.forEach((line, idx) => {
        if (/async\s+(?:function|\([^)]*\)|[a-zA-Z0-9_]+)/.test(line)) {
          inAsync = true;
          hasTry = false;
        }
        if (inAsync && /try\s*\{/.test(line)) hasTry = true;
        if (inAsync && (/await\s+/.test(line) && !hasTry && /req\s*,\s*res/.test(content))) {
          bugs.push({
            title: `Unhandled async exception in ${filePath}`,
            description: `Async request handler executes awaited asynchronous calls without an enclosing try/catch block or error-handling middleware forwarder.`,
            severity: "HIGH",
            priority: "HIGH",
            moduleName,
            filePath,
            lineNumber: idx + 1,
            evidence: [`File: ${filePath}:${idx + 1}`, `Unprotected await: ${line.trim().slice(0, 80)}`],
            rootCause: "Unhandled promise rejection in Express/API handler causing hanging connections or process termination.",
            confidence: 0.88,
            preventions: [
              "Wrap async route handler in try/catch and delegate errors to next(err)",
              "Add global express-async-errors middleware",
              "Write automated failure test for rejected service promises",
            ],
            recommendedFix: "Wrap handler in try { ... } catch (err) { next(err); }.",
          });
          inAsync = false;
        }
      });
    }

    // Rule 4: CORS Wildcard with Credentials Misconfiguration (HIGH)
    lines.forEach((line, idx) => {
      if (
        (line.includes("origin: \"*\"") || line.includes("origin: '*'")) &&
        content.includes("credentials: true")
      ) {
        bugs.push({
          title: `Overly permissive CORS with credentials in ${filePath}`,
          description: `CORS configuration combines wildcard origin (*) with credentials enabled (credentials: true), violating browser security specifications and allowing cross-origin credential harvesting.`,
          severity: "HIGH",
          priority: "HIGH",
          moduleName,
          filePath,
          lineNumber: idx + 1,
          evidence: [`File: ${filePath}:${idx + 1}`, `CORS config: ${line.trim()}`],
          rootCause: "Incompatible and insecure CORS wildcard policy with credentials enabled.",
          confidence: 0.94,
          preventions: [
            "Specify an explicit allowed origin list matching production domain names",
            "Add security headers automated audit",
            "Document frontend-backend CORS origin configuration",
          ],
          recommendedFix: "Specify explicit allowed origins rather than '*' wildcard.",
        });
      }
    });

    // Rule 5: Swallowed Error Catch Block (MEDIUM / HIGH)
    lines.forEach((line, idx) => {
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line) || (/catch\s*\(/.test(line) && lines[idx + 1] && /^\s*\}\s*$/.test(lines[idx + 1]))) {
        bugs.push({
          title: `Swallowed exception in catch block (${filePath})`,
          description: `Catch block silently absorbs exceptions without logging, reporting, or re-throwing, causing silent failure states and masking critical errors.`,
          severity: "MEDIUM",
          priority: "MEDIUM",
          moduleName,
          filePath,
          lineNumber: idx + 1,
          evidence: [`File: ${filePath}:${idx + 1}`, `Empty catch block: ${line.trim()}`],
          rootCause: "Empty catch block suppressing runtime errors and stack traces.",
          confidence: 0.92,
          preventions: [
            "Log all caught errors with structured logger and context",
            "Enforce ESLint rule no-empty to prevent silent failure blocks",
            "Add telemetry alert for error-boundary catches",
          ],
          recommendedFix: "Log error details or propagate to system error boundary.",
        });
      }
    });

    // Rule 6: Missing React Hook Dependency / Stale Closure (MEDIUM)
    if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) {
      lines.forEach((line, idx) => {
        if (/useEffect\(\s*\(\)\s*=>\s*\{/.test(line) && content.includes("useState")) {
          if (content.includes("[]")) {
            bugs.push({
              title: `Potential stale closure in useEffect (${filePath})`,
              description: `React useEffect hook uses an empty dependency array while referencing component state variables, risking stale closure reads during re-renders.`,
              severity: "MEDIUM",
              priority: "MEDIUM",
              moduleName,
              filePath,
              lineNumber: idx + 1,
              evidence: [`File: ${filePath}:${idx + 1}`, `Hook declaration: ${line.trim()}`],
              rootCause: "Omitted state dependencies in React hook dependency array causing stale closure reference.",
              confidence: 0.82,
              preventions: [
                "Include all referenced variables in useEffect dependency list or use functional state updaters",
                "Enable eslint-plugin-react-hooks in project linter",
                "Add component re-render lifecycle unit test",
              ],
              recommendedFix: "Add referenced variables to dependency array or use useCallback/functional setState.",
            });
          }
        }
      });
    }

    // Rule 7: Missing HTTP Request Timeout / Infinite Hang Risk (MEDIUM)
    lines.forEach((line, idx) => {
      if ((/fetch\s*\(/.test(line) || /axios\.(?:get|post|put|delete)\s*\(/.test(line)) && !content.includes("timeout") && !content.includes("AbortController")) {
        bugs.push({
          title: `HTTP client call without timeout in ${filePath}`,
          description: `Network request executes without explicit AbortSignal or timeout limit. Slow or unresponsive upstream servers can exhaust connection pools and hang server workers.`,
          severity: "MEDIUM",
          priority: "MEDIUM",
          moduleName,
          filePath,
          lineNumber: idx + 1,
          evidence: [`File: ${filePath}:${idx + 1}`, `Call: ${line.trim().slice(0, 80)}`],
          rootCause: "Omission of client timeout causing unbounded socket wait during network degradation.",
          confidence: 0.85,
          preventions: [
            "Configure explicit request timeout using AbortSignal.timeout(ms)",
            "Add circuit breaker for external service dependencies",
            "Simulate upstream network timeouts in resilience tests",
          ],
          recommendedFix: "Pass { signal: AbortSignal.timeout(8000) } to fetch options.",
        });
      }
    });

    // Rule 8: Loose Type / Unchecked JSON Parsing (LOW)
    lines.forEach((line, idx) => {
      if (/JSON\.parse\s*\(/.test(line) && !content.includes("try") && !content.includes(".safeParse")) {
        bugs.push({
          title: `Unvalidated JSON.parse in ${filePath}`,
          description: `JSON.parse called directly on input data without try/catch guard or Zod schema validation. Malformed JSON will throw an unhandled SyntaxError.`,
          severity: "LOW",
          priority: "LOW",
          moduleName,
          filePath,
          lineNumber: idx + 1,
          evidence: [`File: ${filePath}:${idx + 1}`, `Code: ${line.trim()}`],
          rootCause: "Unprotected JSON.parse on untrusted external payload.",
          confidence: 0.87,
          preventions: [
            "Wrap JSON.parse in try/catch or use a schema validator like Zod",
            "Add unit test with malformed JSON payload",
            "Define typed schema for payload boundary",
          ],
          recommendedFix: "Use safe JSON parse helper or Zod schema validation.",
        });
      }
    });
  }

  return bugs;
}

/** Main planting workflow that ingests, discovers, analyzes, and populates Nova Garden */
export async function plantProject(
  projectName: string,
  files: Map<string, string>,
  userId: string,
  repoUrl?: string
): Promise<PlantProjectResult> {
  const startTime = Date.now();
  const stages: string[] = [];

  stages.push("Scanning project");
  const { modules: discoveredModules, dependencies } = discoverModulesAndRoots(files);

  stages.push("Detecting modules");
  stages.push("Mapping dependencies");

  stages.push("Detecting bugs");
  const detectedBugs = detectBugs(files, discoveredModules);

  stages.push("Building bug relationships");
  stages.push("Calculating impact");
  stages.push("Generating intelligence");

  // Create Project in database
  const project = await prisma.project.create({
    data: {
      name: projectName,
      description: `Planted codebase analyzed by Nova Garden (${files.size} source files, ${detectedBugs.length} detected ecosystem signals).`,
      repositoryUrl: repoUrl || null,
    },
  });

  // Assign user as OWNER
  await prisma.projectMember.create({
    data: {
      userId,
      projectId: project.id,
      role: "OWNER",
    },
  });

  // Create Modules in database
  const createdModules = new Map<string, { id: string; name: string }>();
  for (const [modName] of discoveredModules.entries()) {
    const m = await prisma.module.create({
      data: {
        name: modName,
        projectId: project.id,
      },
    });
    createdModules.set(modName, m);
  }

  // Create Module Dependencies (Roots) in database
  for (const [fromName, toName] of dependencies) {
    const fromMod = createdModules.get(fromName);
    const toMod = createdModules.get(toName);
    if (fromMod && toMod && fromMod.id !== toMod.id) {
      await prisma.moduleDependency.upsert({
        where: {
          dependentModuleId_dependencyModuleId: {
            dependentModuleId: fromMod.id,
            dependencyModuleId: toMod.id,
          },
        },
        update: {},
        create: {
          dependentModuleId: fromMod.id,
          dependencyModuleId: toMod.id,
        },
      });
    }
  }

  // Create Issues and intelligence records
  const createdIssues: any[] = [];
  for (const bug of detectedBugs) {
    const mod = createdModules.get(bug.moduleName) || [...createdModules.values()][0];
    const createdIssue = await prisma.issue.create({
      data: {
        title: bug.title,
        description: bug.description,
        severity: bug.severity,
        priority: bug.priority,
        status: bug.severity === "CRITICAL" ? "SPREAD" : "OPEN",
        moduleId: mod.id,
        projectId: project.id,
        reporterId: userId,
      },
    });
    createdIssues.push({ ...createdIssue, bugMeta: bug });

    // Create BugAnalysis record
    await prisma.bugAnalysis.create({
      data: {
        issueId: createdIssue.id,
        rootCause: bug.rootCause,
        confidence: bug.confidence,
        evidence: JSON.stringify(bug.evidence),
        affectedDependencies: JSON.stringify([bug.moduleName]),
      },
    });

    // Create BugPrevention checklist rows
    for (const action of bug.preventions) {
      await prisma.bugPrevention.create({
        data: {
          issueId: createdIssue.id,
          action,
          status: "PENDING",
        },
      });
    }

    // Create initial lifecycle history
    await prisma.issueHistory.create({
      data: {
        issueId: createdIssue.id,
        changedById: userId,
        field: "status",
        oldValue: null,
        newValue: createdIssue.status,
      },
    });

    // Create initial static analysis log comment
    await prisma.issueComment.create({
      data: {
        issueId: createdIssue.id,
        authorId: userId,
        body: `Automated detection evidence:\n• File: ${bug.filePath}${bug.lineNumber ? `:${bug.lineNumber}` : ""}\n• Probable Cause: ${bug.rootCause}\n• Recommended Fix: ${bug.recommendedFix}`,
      },
    });
  }

  // Create Bug DNA pairings (IssueRelations) between similar issues
  for (let i = 0; i < createdIssues.length; i++) {
    for (let j = i + 1; j < createdIssues.length; j++) {
      const a = createdIssues[i];
      const b = createdIssues[j];
      const sameModule = a.moduleId === b.moduleId;
      const sameSeverity = a.severity === b.severity;
      const score = sameModule && sameSeverity ? 0.85 : sameModule ? 0.65 : sameSeverity ? 0.45 : 0.25;

      if (score >= 0.45) {
        await prisma.issueRelation.create({
          data: {
            sourceIssueId: a.id,
            targetIssueId: b.id,
            type: "SIMILAR",
            score,
            reason: sameModule ? `Shared module (${a.bugMeta.moduleName}) pattern` : `Matching ${a.severity} risk tier`,
          },
        });
      }
    }
  }

  // Create Codebase Memory entries for historical echoes
  for (const issue of createdIssues.slice(0, 3)) {
    await prisma.codebaseMemory.create({
      data: {
        projectId: project.id,
        issueId: issue.id,
        previousCause: issue.bugMeta.rootCause,
        previousSolution: issue.bugMeta.recommendedFix,
        previousPrevention: issue.bugMeta.preventions[0] || "Add regression test coverage",
        resolutionDate: new Date(Date.now() - 14 * 864e5),
        similarity: 0.88,
      },
    });
  }

  // Compute Module Health & Project Health snapshots
  const moduleHealths = [...createdModules.values()].map((m) => {
    const modIssues = createdIssues.filter((i) => i.moduleId === m.id);
    return computeModuleHealth(m as any, modIssues);
  });

  const overallHealth =
    moduleHealths.length === 0
      ? 100
      : Math.round(moduleHealths.reduce((s, m) => s + m.healthScore, 0) / Math.max(1, moduleHealths.length));

  // Create ProjectHealth snapshot
  await prisma.projectHealth.create({
    data: {
      projectId: project.id,
      score: overallHealth,
      metrics: JSON.stringify({
        healthScore: overallHealth,
        activeBugs: createdIssues.length,
        criticalBugs: createdIssues.filter((i) => i.severity === "CRITICAL").length,
        resolvedBugs: 0,
        preventedBugs: 0,
        moduleHealth: moduleHealths,
      }),
    },
  });

  // Create initial RiskAssessment
  const riskScore = Math.max(0, 100 - overallHealth);
  const riskLevel = riskScore >= 75 ? "CRITICAL" : riskScore >= 50 ? "HIGH" : riskScore >= 25 ? "MEDIUM" : "LOW";
  await prisma.riskAssessment.create({
    data: {
      projectId: project.id,
      score: riskScore,
      level: riskLevel,
      reasons: JSON.stringify(moduleHealths.map((m) => `${m.moduleName}: health ${m.healthScore}/100`)),
    },
  });

  // Create Welcome & Telemetry Notification
  await prisma.notification.create({
    data: {
      userId,
      projectId: project.id,
      title: `Planted "${project.name}" in Nova Garden`,
      body: `Analysis complete: ${files.size} files scanned, ${createdIssues.length} ecosystem signals discovered.`,
    },
  });

  stages.push("Analysis complete");
  const durationMs = Date.now() - startTime;

  const bySeverity = {
    CRITICAL: detectedBugs.filter((b) => b.severity === "CRITICAL").length,
    HIGH: detectedBugs.filter((b) => b.severity === "HIGH").length,
    MEDIUM: detectedBugs.filter((b) => b.severity === "MEDIUM").length,
    LOW: detectedBugs.filter((b) => b.severity === "LOW").length,
  };

  const mostCritical = [...moduleHealths].sort((a, b) => a.healthScore - b.healthScore)[0];
  const highestImpact = detectedBugs.find((b) => b.severity === "CRITICAL") || detectedBugs[0];

  return {
    projectId: project.id,
    projectName: project.name,
    description: project.description || "",
    repositoryUrl: project.repositoryUrl || undefined,
    summary: {
      totalBugs: detectedBugs.length,
      bySeverity,
      moduleCount: createdModules.size,
      modules: moduleHealths.map((m) => ({
        name: m.moduleName,
        healthScore: m.healthScore,
        level: m.level,
        bugCount: m.openIssueCount,
      })),
      healthScore: overallHealth,
      mostCriticalRoot: mostCritical ? `${mostCritical.moduleName} (${mostCritical.healthScore}/100)` : "None",
      highestImpactBug: highestImpact ? highestImpact.title : "None",
      stages,
      scanDurationMs: durationMs,
    },
  };
}
