import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getIssue, updateIssueStatus } from "../api/issueApi";
import * as intel from "../api/intelligenceApi";

function SectionBox({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid var(--color-sage-soft)",
        borderRadius: 14,
        padding: 24,
        marginBottom: 20,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 19, margin: 0, color: "var(--color-forest)" }}>{title}</h2>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8a8878" }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function IssueDetailPage() {
  const { issueId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const queryProjectId = searchParams.get("projectId");

  const [issue, setIssue] = useState<any>(null);
  const [data, setData] = useState<Record<string, any>>({});
  const [duration, setDuration] = useState<number>(7);
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [runningAutopsy, setRunningAutopsy] = useState(false);
  const [autopsyError, setAutopsyError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeProjectId = issue?.projectId || queryProjectId;

  async function load() {
    try {
      if (!queryProjectId) {
        throw new Error("Project context is required to open an issue");
      }

      // Fetch issue details only within the project selected in the Garden.
      const tryProjectId = queryProjectId;
      let issueDetails: any;
      issueDetails = await getIssue(tryProjectId, issueId);

      setIssue(issueDetails);
      const projId = issueDetails.projectId || tryProjectId;

      const [dna, impact, root, evolution, memory, recommendation, prevention] = await Promise.all([
        intel.bugDna(projId, issueId).catch(() => null),
        intel.impact(projId, issueId).catch(() => null),
        intel.rootCause(projId, issueId).catch(() => null),
        intel.evolution(projId, issueId).catch(() => null),
        intel.memory(projId, issueId).catch(() => []),
        intel.recommendation(projId, issueId).catch(() => []),
        intel.prevention(projId, issueId).catch(() => []),
      ]);

      setData((prev) => ({
        ...prev,
        dna,
        impact,
        root,
        evolution,
        memory,
        recommendation,
        prevention,
      }));
    } catch (err) {
      console.error("Failed to load issue details", err);
    }
  }

  useEffect(() => {
    load();
  }, [issueId]);

  async function handleStatusChange(status: string) {
    try {
      await updateIssueStatus(activeProjectId, issueId, status as any);
      setFeedback(`Issue marked as ${status}.`);
      await load();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleRunSimulation() {
    setSimulating(true);
    try {
      const res = await intel.simulate(activeProjectId, issueId, duration);
      setData((prev) => ({ ...prev, simulation: res }));
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setSimulating(false);
    }
  }

  async function handleRunAutopsy() {
    setRunningAutopsy(true);
    setAutopsyError(null);
    try {
      const res = await intel.autopsy(activeProjectId, issueId);
      setData((prev) => ({ ...prev, autopsy: res }));
      setFeedback("Bug autopsy generated.");
      await load();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setAutopsyError(err instanceof Error ? err.message : "Failed to generate autopsy");
    } finally {
      setRunningAutopsy(false);
    }
  }

  async function handleAddComment() {
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      await intel.addComment(activeProjectId, issueId, comment.trim());
      setComment("");
      await load();
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleCompletePrevention(preventionId: string) {
    try {
      await intel.completePrevention(activeProjectId, issueId, preventionId);
      setFeedback("Prevention action marked as completed.");
      await load();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to complete prevention");
    }
  }

  if (!issue) {
    return (
      <div style={{ padding: 40, background: "var(--color-ivory)", minHeight: "100vh" }}>
        <p style={{ color: "var(--color-olive)" }}>Loading issue details & ecosystem telemetry…</p>
      </div>
    );
  }

  const isResolved = issue.status === "RESOLVED" || issue.status === "PREVENTED";

  return (
    <main style={{ maxWidth: 1100, margin: "auto", padding: "32px 24px", background: "var(--color-ivory)", minHeight: "100vh" }}>
      {/* Top Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Link
          to={`/garden?projectId=${activeProjectId}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            textDecoration: "none",
            fontSize: 14,
            color: "var(--color-forest)",
            fontWeight: 500,
          }}
        >
          ← Back to Living Garden
        </Link>
      </div>

      {feedback && (
        <div
          style={{
            padding: "10px 16px",
            background: "#e8f2e1",
            border: "1px solid var(--color-sage-soft)",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            color: "var(--color-forest)",
          }}
        >
          {feedback}
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--color-sage-soft)",
          borderRadius: 14,
          padding: 24,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "var(--color-ivory-deep)",
                }}
              >
                Module: {issue.module?.name}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: issue.severity === "CRITICAL" ? "#fedbd0" : "#feeed5",
                  color: issue.severity === "CRITICAL" ? "var(--color-coral)" : "var(--color-charcoal)",
                }}
              >
                {issue.severity}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: isResolved ? "#e8f2e1" : "var(--color-ivory)",
                  color: isResolved ? "var(--color-forest)" : "var(--color-charcoal)",
                  fontWeight: 600,
                }}
              >
                {issue.status}
              </span>
            </div>
            <h1 style={{ fontSize: 26, margin: "4px 0 8px", color: "var(--color-forest)" }}>{issue.title}</h1>
            <p style={{ margin: 0, fontSize: 14, color: "#514f45", lineHeight: 1.5 }}>{issue.description}</p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {!isResolved ? (
              <button
                onClick={() => handleStatusChange("RESOLVED")}
                style={{
                  padding: "10px 18px",
                  background: "var(--color-forest)",
                  color: "var(--color-ivory)",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Mark as Resolved
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange("OPEN")}
                style={{
                  padding: "10px 18px",
                  background: "#fff",
                  color: "var(--color-forest)",
                  border: "1px solid var(--color-sage-soft)",
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Reopen Issue
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
        {/* 1. Bug DNA */}
        <SectionBox
          title="Bug DNA (Organic Similarity)"
          subtitle="Identifies related bugs across your codebase history by text overlap, module proximity, and status patterns."
        >
          {data.dna?.related?.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {data.dna.related.map((rel: any) => (
                <div
                  key={rel.issueId}
                  style={{
                    padding: "12px 16px",
                    background: "var(--color-ivory)",
                    borderRadius: 8,
                    border: "1px solid #e8e4d8",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <Link
                      to={`/issues/${rel.issueId}`}
                      style={{ textDecoration: "none", color: "var(--color-forest)", fontWeight: 600, fontSize: 14 }}
                    >
                      {rel.title}
                    </Link>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 12, color: "#8a8878" }}>
                      <span>Module: {rel.module}</span>
                      <span>·</span>
                      <span>Status: {rel.status}</span>
                      {rel.sharedKeywords?.length > 0 && (
                        <>
                          <span>·</span>
                          <span>Keywords: {rel.sharedKeywords.join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: "#fff",
                      border: "1px solid var(--color-sage-soft)",
                      color: "var(--color-forest)",
                    }}
                  >
                    {rel.score}% match
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#8a8878", margin: 0 }}>No direct DNA relatives found in historical records.</p>
          )}
        </SectionBox>

        {/* 2. Impact Radius */}
        <SectionBox
          title="Impact Radius & Dependency Path"
          subtitle="Illuminates the outward dependency propagation through the codebase root network."
        >
          {data.impact ? (
            <div>
              <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ padding: "10px 16px", background: "var(--color-ivory)", borderRadius: 8, flex: 1 }}>
                  <small style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#8a8878" }}>ORIGIN PLANT</small>
                  <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 600 }}>{data.impact.originModule}</p>
                </div>
                <div style={{ padding: "10px 16px", background: "var(--color-ivory)", borderRadius: 8, flex: 1 }}>
                  <small style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#8a8878" }}>DIRECT IMPACT</small>
                  <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 600 }}>{data.impact.directImpact?.length ?? 0} modules</p>
                </div>
                <div style={{ padding: "10px 16px", background: "var(--color-ivory)", borderRadius: 8, flex: 1 }}>
                  <small style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#8a8878" }}>INDIRECT IMPACT</small>
                  <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 600 }}>{data.impact.indirectImpact?.length ?? 0} modules</p>
                </div>
              </div>

              <h4 style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "#8a8878", marginBottom: 8 }}>
                CONNECTED MODULES IN BLAST RADIUS
              </h4>
              <div style={{ display: "grid", gap: 8 }}>
                {data.impact.affectedModules?.map((m: any) => (
                  <div
                    key={m.moduleId}
                    style={{
                      padding: "8px 12px",
                      background: "#fff",
                      border: "1px solid var(--color-sage-soft)",
                      borderRadius: 6,
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                    }}
                  >
                    <span>
                      <strong>{m.moduleName}</strong> ({m.hops === 0 ? "Origin" : `${m.hops} hop${m.hops > 1 ? "s" : ""}`})
                    </span>
                    <span
                      style={{
                        color: m.impact === "DIRECT" ? "var(--color-coral)" : "var(--color-olive)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                      }}
                    >
                      {m.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#8a8878", margin: 0 }}>Computing impact radius…</p>
          )}
        </SectionBox>

        {/* 3. Root Cause Explorer */}
        <SectionBox
          title="Root Cause Explorer"
          subtitle="Underground analysis tracing symptoms back to core dependency failures."
        >
          {data.root ? (
            <div>
              <div
                style={{
                  padding: 16,
                  background: "var(--color-ivory)",
                  borderRadius: 10,
                  border: "1px solid #e8e4d8",
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <small style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#8a8878" }}>ESTIMATED ROOT CAUSE</small>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      padding: "2px 8px",
                      background: "var(--color-sage-soft)",
                      borderRadius: 6,
                      color: "var(--color-forest)",
                    }}
                  >
                    {Math.round(data.root.confidence * 100)}% confidence
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--color-charcoal)" }}>{data.root.rootCause}</p>
              </div>

              {data.root.evidence && (
                <div>
                  <h4 style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#8a8878", margin: "0 0 6px" }}>
                    SUPPORTING EVIDENCE SIGNALS
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: "#514f45" }}>
                    {(Array.isArray(data.root.evidence) ? data.root.evidence : []).map((ev: string, idx: number) => (
                      <li key={idx}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#8a8878", margin: 0 }}>Investigating root cause signals…</p>
          )}
        </SectionBox>

        {/* 4. What-If Simulator */}
        <SectionBox
          title="What-If Simulator"
          subtitle="Deterministic projection of how failure propagates if left unaddressed over time."
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <label style={{ fontSize: 14, color: "#514f45" }}>
              Simulate bug left open for:
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{
                  marginLeft: 8,
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--color-sage-soft)",
                  background: "#fff",
                  fontSize: 14,
                }}
              >
                <option value={1}>1 Day</option>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days (1 Week)</option>
                <option value={14}>14 Days (2 Weeks)</option>
              </select>
            </label>
            <button
              onClick={handleRunSimulation}
              disabled={simulating}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                background: "var(--color-forest)",
                color: "var(--color-ivory)",
                border: "none",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {simulating ? "Simulating…" : "Run Simulation"}
            </button>
          </div>

          {data.simulation && (
            <div style={{ padding: 16, background: "var(--color-ivory)", borderRadius: 10, border: "1px solid #e8e4d8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Projected Overall Risk Score: {data.simulation.projectedRisk}/100</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-coral)" }}>
                  {data.simulation.label}
                </span>
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {data.simulation.results?.map((res: any) => (
                  <div
                    key={res.id || res.moduleId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      padding: "6px 10px",
                      background: "#fff",
                      borderRadius: 6,
                    }}
                  >
                    <span>{res.moduleName}</span>
                    <span>Projected Risk: {res.projectedRisk}/100</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionBox>

        {/* 5. Bug Evolution */}
        <SectionBox
          title="Bug Evolution & Lifecycle"
          subtitle="Tracks progression through ecosystem stages: SEED → OPEN → SPREAD → RESOLVED → PREVENTED."
        >
          {data.evolution ? (
            <div>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                {["SEED", "OPEN", "SPREAD", "RESOLVED", "PREVENTED"].map((stage) => {
                  const current = data.evolution.current;
                  const isCurrent = current === stage;
                  return (
                    <div
                      key={stage}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        background: isCurrent ? "var(--color-forest)" : "var(--color-ivory)",
                        color: isCurrent ? "var(--color-ivory)" : "var(--color-charcoal)",
                        border: isCurrent ? "none" : "1px solid #e8e4d8",
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        textAlign: "center",
                        flex: 1,
                      }}
                    >
                      {stage}
                    </div>
                  );
                })}
              </div>

              <h4 style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#8a8878", margin: "0 0 8px" }}>
                LIFECYCLE AUDIT TRAIL
              </h4>
              <div style={{ display: "grid", gap: 6 }}>
                {issue.history?.length > 0 ? (
                  issue.history.map((h: any) => (
                    <div
                      key={h.id}
                      style={{
                        fontSize: 12,
                        padding: "6px 10px",
                        background: "var(--color-ivory)",
                        borderRadius: 6,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        Field <strong>{h.field}</strong> changed from <code>{h.oldValue || "none"}</code> to{" "}
                        <code>{h.newValue}</code> by {h.changedBy?.name || "System"}
                      </span>
                      <span style={{ color: "#8a8878" }}>{new Date(h.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: 13, color: "#8a8878", margin: 0 }}>No status changes recorded yet.</p>
                )}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#8a8878", margin: 0 }}>Loading lifecycle telemetry…</p>
          )}
        </SectionBox>

        {/* 6. Codebase Memory */}
        <SectionBox
          title="Codebase Memory"
          subtitle="Echoes previous resolutions when a new bug shares traits with historical occurrences."
        >
          {data.memory?.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {data.memory.map((mem: any) => (
                <div
                  key={mem.issueId}
                  style={{
                    padding: 14,
                    background: "var(--color-ivory)",
                    borderRadius: 8,
                    border: "1px solid #e8e4d8",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <strong style={{ fontSize: 14, color: "var(--color-forest)" }}>{mem.title}</strong>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-olive)" }}>
                      {mem.similarity}% similarity
                    </span>
                  </div>
                  <p style={{ margin: "4px 0", fontSize: 13, color: "#514f45" }}>
                    <strong>Previous Cause:</strong> {mem.previousCause}
                  </p>
                  <p style={{ margin: "4px 0", fontSize: 13, color: "#514f45" }}>
                    <strong>Previous Solution:</strong> {mem.previousSolution}
                  </p>
                  {mem.previousPrevention && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8a8878" }}>
                      <strong>Prevention:</strong> {mem.previousPrevention}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#8a8878", margin: 0 }}>No memory matches recorded for this pattern.</p>
          )}
        </SectionBox>

        {/* 7. Developer Recommendation */}
        <SectionBox
          title="Developer Recommendation"
          subtitle="Ranked by module expertise, relevant resolution history, and current workload balance."
        >
          {data.recommendation?.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              {data.recommendation.map((rec: any) => (
                <div
                  key={rec.developer.id}
                  style={{
                    padding: 16,
                    background: "var(--color-ivory)",
                    borderRadius: 10,
                    border: "1px solid #e8e4d8",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <strong style={{ fontSize: 14, color: "var(--color-charcoal)" }}>{rec.developer.name}</strong>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: "#fff",
                        border: "1px solid var(--color-sage-soft)",
                        color: "var(--color-forest)",
                      }}
                    >
                      {rec.matchScore}% match
                    </span>
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: 12, color: "#8a8878" }}>{rec.developer.email}</p>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.5, color: "#514f45" }}>
                    {rec.reasons?.map((reason: string, rIdx: number) => (
                      <li key={rIdx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#8a8878", margin: 0 }}>No expert recommendation available for this issue. Add contributors with relevant module experience or resolution history to enable matching.</p>
          )}
        </SectionBox>

        {/* 8. Bug Autopsy */}
        <SectionBox
          title="Bug Autopsy"
          subtitle="Post-mortem analysis after resolution to record cause, survival, and prevention requirements."
        >
          {!isResolved ? (
            <div style={{ padding: 14, background: "var(--color-ivory)", borderRadius: 8, fontSize: 13, color: "#514f45" }}>
              Please <strong>Resolve the issue</strong> first to unlock and perform the bug autopsy.
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 14 }}>
                <button
                  onClick={handleRunAutopsy}
                  disabled={runningAutopsy}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "var(--color-forest)",
                    color: "var(--color-ivory)",
                    border: "none",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {runningAutopsy ? "Analyzing…" : "Run Bug Autopsy"}
                </button>
              </div>

              {autopsyError && <p style={{ color: "var(--color-coral)", fontSize: 13 }}>{autopsyError}</p>}

              {(data.autopsy || issue.autopsy) && (
                <div style={{ padding: 16, background: "var(--color-ivory)", borderRadius: 10, border: "1px solid #e8e4d8" }}>
                  <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                    <div>
                      <strong>Cause of Failure:</strong> {(data.autopsy || issue.autopsy).causeOfFailure}
                    </div>
                    <div>
                      <strong>Why It Survived:</strong> {(data.autopsy || issue.autopsy).whyItSurvived}
                    </div>
                    <div>
                      <strong>Resolution:</strong> {(data.autopsy || issue.autopsy).resolution}
                    </div>
                    <div>
                      <strong>Prevention Recommendation:</strong> {(data.autopsy || issue.autopsy).preventionRecommendation}
                    </div>
                    <div>
                      <strong>Active Duration:</strong> {(data.autopsy || issue.autopsy).timeActiveHours} hours
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionBox>

        {/* 9. Bug Prevention Workflow */}
        <SectionBox
          title="Bug Prevention Workflow"
          subtitle="Complete every prevention item to fortify the codebase and elevate status to PREVENTED."
        >
          <div style={{ display: "grid", gap: 10 }}>
            {data.prevention?.map((item: any) => {
              const completed = item.status === "COMPLETED";
              return (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 16px",
                    background: completed ? "#f4f8f0" : "var(--color-ivory)",
                    borderRadius: 8,
                    border: completed ? "1px solid var(--color-sage-soft)" : "1px solid #e8e4d8",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: completed ? "#e8f2e1" : "var(--color-ivory-deep)",
                        color: completed ? "var(--color-forest)" : "var(--color-charcoal)",
                      }}
                    >
                      {item.status}
                    </span>
                    <span style={{ fontSize: 14, color: "var(--color-charcoal)" }}>{item.action}</span>
                  </div>

                  {!completed && (
                    <button
                      onClick={() => handleCompletePrevention(item.id)}
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        borderRadius: 6,
                        background: "#fff",
                        border: "1px solid var(--color-sage-soft)",
                        color: "var(--color-forest)",
                        cursor: "pointer",
                      }}
                    >
                      Complete Action
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </SectionBox>

        {/* 10. Investigation Comments */}
        <SectionBox
          title="Investigation Evidence & Comments"
          subtitle="Telemetry discussion and evidence logged by team contributors."
        >
          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            {issue.comments?.length > 0 ? (
              issue.comments.map((c: any) => (
                <div
                  key={c.id}
                  style={{
                    padding: 12,
                    background: "var(--color-ivory)",
                    borderRadius: 8,
                    border: "1px solid #e8e4d8",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, color: "var(--color-forest)" }}>{c.author?.name || "Team Member"}</strong>
                    <span style={{ fontSize: 11, color: "#8a8878" }}>{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#514f45" }}>{c.body}</p>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 13, color: "#8a8878", margin: 0 }}>No comments recorded yet.</p>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Record investigation findings or telemetry notes…"
              rows={2}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-sage-soft)",
                fontSize: 13,
                fontFamily: "var(--font-body)",
              }}
            />
            <button
              onClick={handleAddComment}
              disabled={submittingComment || !comment.trim()}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                background: "var(--color-forest)",
                color: "var(--color-ivory)",
                border: "none",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {submittingComment ? "Posting…" : "Add Comment"}
            </button>
          </div>
        </SectionBox>
      </div>
    </main>
  );
}

