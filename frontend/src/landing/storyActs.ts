export interface StoryAct {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  align?: "left" | "right" | "center";
}

export const STORY_ACTS: StoryAct[] = [
  {
    id: "hero",
    eyebrow: "NOVA",
    title: "Grow better code.",
    body: "Find the bugs before they spread.",
    align: "center",
  },
  {
    id: "ecosystem",
    eyebrow: "01 · The metaphor",
    title: "Your codebase is a living ecosystem.",
    body: "Every module is a plant. Every dependency is a root. Watch one, and you're watching all of them.",
    align: "left",
  },
  {
    id: "spread",
    eyebrow: "02 · What we're watching for",
    title: "Then something starts to spread.",
    body: "A bug lands in Checkout. Left alone, it doesn't stay in Checkout.",
    align: "right",
  },
  {
    id: "scan",
    eyebrow: "03 · Detection",
    title: "Bug detected.",
    body: "NOVA scans the ecosystem continuously — not just the module where a bug was reported, but everything connected to it.",
    align: "left",
  },
  {
    id: "impact",
    eyebrow: "04 · Impact Radius",
    title: "See what else is at risk.",
    body: "The roots light up outward from Checkout, through Payments, into Orders and Notifications — the real dependency path, not a guess.",
    align: "right",
  },
  {
    id: "dna",
    eyebrow: "05 · Bug DNA",
    title: "Every bug has relatives.",
    body: "NOVA compares this bug against your project's history and connects it to the ones that share its shape.",
    align: "left",
  },
  {
    id: "root_cause",
    eyebrow: "06 · Root Cause Explorer",
    title: "Find the root, not just the symptom.",
    body: "Underground, past the visible damage: a session validation failure in Authentication, the actual source of the timeout above.",
    align: "center",
  },
  {
    id: "whatif",
    eyebrow: "07 · What-If Simulator",
    title: "What if this stays open for a week?",
    body: "NOVA projects how the bug could spread through dependent modules — labeled clearly as a projection, never a guarantee.",
    align: "right",
  },
  {
    id: "developer",
    eyebrow: "08 · Developer Recommendation",
    title: "Who should tend to it?",
    body: "Ranked by real signal: past work in this module, related bugs resolved, and current workload — not seniority or guesswork.",
    align: "left",
  },
  {
    id: "autopsy",
    eyebrow: "09 · Bug Autopsy",
    title: "After it's fixed, understand why it happened.",
    body: "Cause, origin, blast radius, and why it wasn't caught sooner — recorded once, so no one has to relearn it.",
    align: "right",
  },
  {
    id: "memory",
    eyebrow: "10 · Codebase Memory",
    title: "Some bugs, we've already met.",
    body: "NOVA remembers. When a new bug resembles an old one, it surfaces what fixed it last time.",
    align: "left",
  },
  {
    id: "seasons",
    eyebrow: "11 · Garden Seasons",
    title: "Every project has a season.",
    body: "Spring builds features. Summer holds steady. Autumn refactors. Winter fixes bugs. NOVA reads which one you're in from real activity.",
    align: "center",
  },
  {
    id: "risk",
    eyebrow: "12 · Projected Risk",
    title: "What breaks next?",
    body: "Modules with rising issue counts and heavy dependencies get flagged before they become the next Checkout.",
    align: "right",
  },
  {
    id: "resolution",
    eyebrow: "13 · Resolution",
    title: "The bug is fixed. The garden knows.",
    body: "Weeds clear. Roots dim. A new, sturdier growth appears where the prevention work was done.",
    align: "left",
  },
  {
    id: "transform",
    eyebrow: "14 · The application",
    title: "This is the actual product.",
    body: "Not a mockup layered on top of a dashboard — the garden IS the dashboard, grown from your real data.",
    align: "center",
  },
];
