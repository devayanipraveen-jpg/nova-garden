import React, { useEffect, useState } from "react";
import { fetchGarden, GardenView } from "../api/gardenApi";
import GardenCanvas, { GardenBug } from "../garden/GardenCanvas";
import { Link, useSearchParams } from "react-router-dom";
import { listIssues, Issue } from "../api/issueApi";
import * as intelligence from "../api/intelligenceApi";
import { exportProjectAnalysis, fetchProjects, ProjectItem } from "../api/plantApi";
import PlantProjectModal from "../components/PlantProjectModal";

export default function GardenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get("projectId");

  const [activeProjectId, setActiveProjectId] = useState<string | null>(initialProjectId);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [garden, setGarden] = useState<GardenView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [insights, setInsights] = useState<any>({});
  const [notices, setNotices] = useState<any[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);

  async function load(targetProjectId = activeProjectId) {
    if (!targetProjectId) {
      setGarden(null);
      setIssues([]);
      setInsights({});
      setNotices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch available projects
      const projectList = await fetchProjects().catch(() => []);
      setProjects(projectList);

      const data = await fetchGarden(targetProjectId);
      setGarden(data);

      const [issueRows, health, risk, season, notifs, analytics] = await Promise.all([
        listIssues(targetProjectId),
        intelligence.health(targetProjectId).catch(() => null),
        intelligence.risk(targetProjectId).catch(() => null),
        intelligence.season(targetProjectId).catch(() => null),
        intelligence.notifications(targetProjectId).catch(() => []),
        intelligence.analytics(targetProjectId).catch(() => null),
      ]);
      setIssues(issueRows);
      setNotices(notifs || []);
      setInsights({ health, risk, season, analytics });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load garden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  function handleSelectProject(projectId: string) {
    setActiveProjectId(projectId);
    setSearchParams({ projectId });
  }

  function handlePlantAnotherProject() {
    setError(null);
    setIsPlantModalOpen(true);
  }

  async function handleMarkRead(id: string) {
    if (!activeProjectId) return;
    try {
      await intelligence.readNotification(activeProjectId, id);
      setNotices((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  }

  const unreadNotices = notices.filter((n) => !n.read);
  const filteredIssues = selectedSeverity === "ALL" 
    ? issues 
    : issues.filter((i) => i.severity === selectedSeverity);
  const hasProject = Boolean(garden);

  async function handleExport() {
    if (!activeProjectId || !garden) return;
    const exportBlob = await exportProjectAnalysis(activeProjectId);
    const downloadUrl = URL.createObjectURL(exportBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${garden.projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "nova-garden"}-analysis.json`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <div className="garden-page" style={{ minHeight: "100vh", background: "var(--color-ivory)", padding: "32px 40px" }}>
      <header
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link to="/" style={{ textDecoration: "none" }}>
              <h1 style={{ fontSize: 28, margin: 0, color: "var(--color-forest)" }}><span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75em", fontWeight: 700 }}>NOVA</span> garden</h1>
            </Link>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                padding: "3px 8px",
                background: "var(--color-sage-soft)",
                borderRadius: 12,
                color: "var(--color-forest)",
              }}
            >
              Living Ecosystem
            </span>

            {/* Project Switcher Dropdown */}
            {projects.length > 0 && (
              <div style={{ marginLeft: 6 }}>
                <select
                  value={activeProjectId ?? ""}
                  onChange={(e) => handleSelectProject(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--color-sage-soft)",
                    background: "#fff",
                    fontSize: 13,
                    fontFamily: "var(--font-body)",
                    color: "var(--color-forest)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      🌿 {p.name} ({p.moduleCount} modules, {p.openIssueCount} open)
                    </option>
                  ))}
                  {!projects.some((p) => p.id === activeProjectId) && (
                    <option value={activeProjectId ?? ""}>🌿 {garden?.projectName || activeProjectId}</option>
                  )}
                </select>
              </div>
            )}
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8a8878" }}>
            The living state of your codebase — grown from live issue data and dependency trees.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto" }}>
          {garden && (
            <>
              <button
                onClick={() => load(activeProjectId)}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-sage-soft)", background: "#fff", fontSize: 13, fontFamily: "var(--font-body)", cursor: "pointer" }}
              >
                Refresh
              </button>
              <button
                onClick={handlePlantAnotherProject}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-sage-soft)", background: "#fff", fontSize: 13, fontFamily: "var(--font-body)", cursor: "pointer" }}
              >
                Plant Another Project
              </button>
              <button
                onClick={() => handleExport().catch((err) => setError(err instanceof Error ? err.message : "Failed to export analysis"))}
                style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--color-charcoal)", color: "var(--color-ivory)", fontSize: 13, fontFamily: "var(--font-body)", cursor: "pointer" }}
              >
                Export Dashboard
              </button>
            </>
          )}
        </div>
      </header>

      {/* Plant a New Project Modal */}
      <PlantProjectModal
        isOpen={isPlantModalOpen}
        onClose={() => setIsPlantModalOpen(false)}
        onPlantComplete={(newProjectId) => {
          handleSelectProject(newProjectId);
        }}
      />

      {loading && !garden && <p style={{ color: "var(--color-olive)" }}>Tending garden & computing signals…</p>}
      {error && (
        <div
          style={{
            padding: 16,
            background: "#fff0ed",
            border: "1px solid var(--color-coral)",
            borderRadius: 8,
            marginBottom: 20,
            color: "var(--color-coral)",
          }}
        >
          {error}. Ensure the backend is running on http://localhost:4000.
        </div>
      )}

      <GardenCanvas garden={garden} onPlantProject={() => setIsPlantModalOpen(true)} />

      <section className={!hasProject ? "garden-dashboard garden-dashboard--empty" : "garden-dashboard"} style={{ marginTop: 32 }}>
          {!hasProject && (
            <svg className="garden-dashboard__bugs" viewBox="0 0 1000 820" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="dashboard-bug-coral" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F37875" /><stop offset="58%" stopColor="#D94D48" /><stop offset="100%" stopColor="#9F3432" /></linearGradient>
                <linearGradient id="dashboard-bug-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F5CF69" /><stop offset="58%" stopColor="#D99A3F" /><stop offset="100%" stopColor="#A9652D" /></linearGradient>
                <linearGradient id="dashboard-bug-moss" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#8EAA75" /><stop offset="58%" stopColor="#5F805F" /><stop offset="100%" stopColor="#3E5944" /></linearGradient>
                <linearGradient id="dashboard-bug-slate" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#B7B2A8" /><stop offset="58%" stopColor="#817C72" /><stop offset="100%" stopColor="#57544D" /></linearGradient>
              </defs>
              <GardenBug x={32} y={74} rotation={-18} color="coral" scale={0.62} gradientPrefix="dashboard-bug" />
              <GardenBug x={954} y={225} rotation={28} color="moss" scale={0.58} gradientPrefix="dashboard-bug" />
              <GardenBug x={58} y={420} rotation={-34} color="gold" scale={0.52} gradientPrefix="dashboard-bug" />
              <GardenBug x={920} y={548} rotation={16} color="slate" scale={0.66} gradientPrefix="dashboard-bug" />
              <GardenBug x={140} y={738} rotation={42} color="coral" scale={0.48} gradientPrefix="dashboard-bug" />
            </svg>
          )}
          {/* Top Intelligence Metrics */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <div
              style={{
                padding: 18,
                background: "#fff",
                borderRadius: 12,
                border: "1px solid var(--color-sage-soft)",
              }}
            >
              <small style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#8a8878" }}>
                PROJECT HEALTH
              </small>
              <h2 style={{ fontSize: 28, margin: "6px 0 2px", color: "var(--color-forest)" }}>
                {hasProject ? `${insights.health?.healthScore ?? garden?.overallHealth}/100` : "Waiting"}
              </h2>
              <span style={{ fontSize: 12, color: "var(--color-olive)" }}>
                {hasProject ? `${insights.health?.activeBugs ?? 0} active · ${insights.health?.resolvedBugs ?? 0} resolved` : "Plant a project to calculate health"}
              </span>
            </div>

            <div
              style={{
                padding: 18,
                background: "#fff",
                borderRadius: 12,
                border: "1px solid var(--color-sage-soft)",
              }}
            >
              <small style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#8a8878" }}>
                PROJECTED RISK
              </small>
              <h2
                style={{
                  fontSize: 28,
                  margin: "6px 0 2px",
                  color: insights.risk?.riskLevel === "CRITICAL" ? "var(--color-coral)" : "var(--color-forest)",
                }}
              >
                {hasProject ? insights.risk?.riskLevel ?? "Unknown" : "Waiting"}
              </h2>
              <span style={{ fontSize: 12, color: "#514f45" }}>
                {hasProject ? `Score: ${insights.risk?.riskScore ?? "--"}/100 heuristic` : "Analysis will assess project risk"}
              </span>
            </div>

            <div
              style={{
                padding: 18,
                background: "#fff",
                borderRadius: 12,
                border: "1px solid var(--color-sage-soft)",
              }}
            >
              <small style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#8a8878" }}>
                GARDEN SEASON
              </small>
              <h2 style={{ fontSize: 28, margin: "6px 0 2px", color: "var(--color-forest)" }}>
                {hasProject ? insights.season?.currentSeason ?? "Unknown" : "Waiting"}
              </h2>
              <span style={{ fontSize: 12, color: "#514f45" }}>
                {hasProject ? insights.season?.reason ?? "Season unavailable" : "Analysis will determine the season"}
              </span>
            </div>

            <div
              style={{
                padding: 18,
                background: "#fff",
                borderRadius: 12,
                border: "1px solid var(--color-sage-soft)",
              }}
            >
              <small style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#8a8878" }}>
                UNREAD SIGNALS
              </small>
              <h2
                style={{
                  fontSize: 28,
                  margin: "6px 0 2px",
                  color: unreadNotices.length > 0 ? "var(--color-coral)" : "var(--color-forest)",
                }}
              >
                {unreadNotices.length}
              </h2>
              <span style={{ fontSize: 12, color: "#514f45" }}>
                {hasProject ? `${notices.length} total recorded ecosystem notifications` : "Analysis notifications will appear here"}
              </span>
            </div>
          </div>

          {/* Ecosystem Notifications Panel */}
          {hasProject && notices.length > 0 && (
            <div
              style={{
                marginTop: 24,
                padding: 18,
                background: "#fff",
                borderRadius: 12,
                border: "1px solid var(--color-sage-soft)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, margin: 0 }}>Ecosystem Notifications & Signals</h3>
                <span style={{ fontSize: 12, color: "#8a8878", fontFamily: "var(--font-mono)" }}>
                  {unreadNotices.length} unread
                </span>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {notices.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: n.read ? "var(--color-ivory)" : "#fff8f5",
                      border: n.read ? "1px solid #e8e4d8" : "1px solid #fedbd0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 13, color: n.read ? "var(--color-charcoal)" : "var(--color-coral)" }}>
                        {n.title}
                      </strong>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#514f45" }}>{n.body}</p>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        style={{
                          padding: "4px 10px",
                          fontSize: 11,
                          borderRadius: 6,
                          border: "1px solid var(--color-sage-soft)",
                          background: "#fff",
                          color: "var(--color-forest)",
                          cursor: "pointer",
                        }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasProject && (
            <div style={{ marginTop: 24, padding: 18, background: "#fff", borderRadius: 12, border: "1px solid var(--color-sage-soft)" }}>
              <h3 style={{ fontSize: 16, margin: "0 0 6px" }}>Ecosystem Notifications & Signals</h3>
              <p style={{ margin: 0, fontSize: 13, color: "#8a8878" }}>Notifications will appear when Nova Garden has analyzed a submitted project.</p>
            </div>
          )}

          {/* Analytics Snapshot */}
          {hasProject && insights.analytics && (
            <div
              style={{
                marginTop: 24,
                padding: 20,
                background: "#fff",
                borderRadius: 12,
                border: "1px solid var(--color-sage-soft)",
              }}
            >
              <h3 style={{ fontSize: 16, marginBottom: 16 }}>Ecosystem Analytics & Workload</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <h4 style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#8a8878", margin: "0 0 8px" }}>
                    SEVERITY DISTRIBUTION
                  </h4>
                  <div style={{ display: "grid", gap: 4 }}>
                    {Object.entries(insights.analytics.severityDistribution || {}).map(([sev, count]: any) => (
                      <div key={sev} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: sev === "CRITICAL" ? "var(--color-coral)" : "#514f45" }}>{sev}</span>
                        <strong>{count}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#8a8878", margin: "0 0 8px" }}>
                    DEVELOPER WORKLOAD
                  </h4>
                  <div style={{ display: "grid", gap: 4 }}>
                    {(insights.analytics.developerWorkload || []).slice(0, 5).map(([dev, count]: any) => (
                      <div key={dev} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span>{dev}</span>
                        <strong>{count} issues</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#8a8878", margin: "0 0 8px" }}>
                    BUG RECURRENCE BY MODULE
                  </h4>
                  <div style={{ display: "grid", gap: 4 }}>
                    {(insights.analytics.bugRecurrence || []).slice(0, 5).map(([mod, count]: any) => (
                      <div key={mod} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span>{mod}</span>
                        <strong>{count} total</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!hasProject && (
            <div style={{ marginTop: 24, padding: 20, background: "#fff", borderRadius: 12, border: "1px solid var(--color-sage-soft)" }}>
              <h3 style={{ fontSize: 16, margin: "0 0 6px" }}>Ecosystem Analytics & Workload</h3>
              <p style={{ margin: 0, fontSize: 13, color: "#8a8878" }}>Severity, module recurrence, and workload analytics will populate from your project&apos;s analysis.</p>
            </div>
          )}

          {/* Active Ecosystem Issues */}
          <div style={{ marginTop: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 20, margin: 0 }}>Active Ecosystem Issues</h2>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "#8a8878" }}>
                  Select an issue to inspect its Bug DNA, Impact Radius, Root Cause, What-If simulation, Autopsy, and Prevention workflow.
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    style={{
                      padding: "4px 10px",
                      fontSize: 12,
                      borderRadius: 6,
                      border: selectedSeverity === sev ? "1px solid var(--color-forest)" : "1px solid var(--color-sage-soft)",
                      background: selectedSeverity === sev ? "var(--color-forest)" : "#fff",
                      color: selectedSeverity === sev ? "#fff" : "var(--color-charcoal)",
                      cursor: "pointer",
                    }}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {filteredIssues.map((issue) => (
                <Link
                  key={issue.id}
                  to={`/issues/${issue.id}?projectId=${activeProjectId}`}
                  style={{
                    padding: "14px 18px",
                    background: "#fff",
                    borderRadius: 10,
                    color: "inherit",
                    textDecoration: "none",
                    border: "1px solid var(--color-sage-soft)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 15, color: "var(--color-charcoal)" }}>{issue.title}</strong>
                    <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 12, color: "#8a8878" }}>
                      <span>Module: {garden?.modules.find((m) => m.moduleId === issue.moduleId)?.moduleName ?? "Module"}</span>
                      <span>·</span>
                      <span>Priority: {issue.priority}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        background:
                          issue.severity === "CRITICAL"
                            ? "#fedbd0"
                            : issue.severity === "HIGH"
                            ? "#feeed5"
                            : "var(--color-ivory-deep)",
                        color: issue.severity === "CRITICAL" ? "var(--color-coral)" : "var(--color-charcoal)",
                      }}
                    >
                      {issue.severity}
                    </span>
                    <span
                      style={{
                        marginLeft: 8,
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        background:
                          issue.status === "RESOLVED" || issue.status === "PREVENTED"
                            ? "#e8f2e1"
                            : "var(--color-ivory)",
                        color:
                          issue.status === "RESOLVED" || issue.status === "PREVENTED"
                            ? "var(--color-forest)"
                            : "var(--color-charcoal)",
                      }}
                    >
                      {issue.status}
                    </span>
                  </div>
                </Link>
              ))}
              {filteredIssues.length === 0 && (
                <div style={{ padding: "18px", background: "#fff", borderRadius: 10, border: "1px solid var(--color-sage-soft)", color: "#8a8878", fontSize: 13 }}>
                  {hasProject ? "No issues were detected in this analysis." : "Detected issues will appear here after you plant a project."}
                </div>
              )}
            </div>
          </div>
      </section>
    </div>
  );
}
