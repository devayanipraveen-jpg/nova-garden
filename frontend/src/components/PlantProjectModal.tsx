import React, { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { plantProjectZip, plantProjectUrl, PlantProjectResult } from "../api/plantApi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPlantComplete: (projectId: string) => void;
}

const ANALYSIS_STAGES = [
  "Preparing your project",
  "Reading project files",
  "Analyzing source code",
  "Detecting bugs and issues",
  "Assessing security and risk",
  "Running Nova Garden intelligence",
  "Growing your Garden",
];

export default function PlantProjectModal({ isOpen, onClose, onPlantComplete }: Props) {
  const [tab, setTab] = useState<"zip" | "folder" | "url">("zip");
  const [file, setFile] = useState<File | null>(null);
  const [folderFiles, setFolderFiles] = useState<File[]>([]);
  const [projectName, setProjectName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTab("zip");
    setFile(null);
    setFolderFiles([]);
    setProjectName("");
    setRepoUrl("");
    setBranch("main");
    setCurrentStageIdx(0);
    setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  async function simulateProgress() {
    for (let i = 0; i < ANALYSIS_STAGES.length - 1; i++) {
      setCurrentStageIdx(i);
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  async function createFolderArchive() {
    if (folderFiles.length === 0) {
      throw new Error("Please select a project folder");
    }

    const archive = new JSZip();
    for (const sourceFile of folderFiles) {
      const relativePath = sourceFile.webkitRelativePath || sourceFile.name;
      if (!relativePath.split("/").some((segment) => ["node_modules", ".git", "dist", "build"].includes(segment))) {
        archive.file(relativePath, sourceFile);
      }
    }

    const archiveBlob = await archive.generateAsync({ type: "blob", compression: "DEFLATE" });
    return new File([archiveBlob], `${projectName.trim() || "project-folder"}.zip`, { type: "application/zip" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setCurrentStageIdx(0);

    // Start UI progress ticker
    const progressPromise = simulateProgress();

    try {
      let plantRes: PlantProjectResult;
      if (tab === "zip") {
        if (!file) {
          throw new Error("Please select a .zip codebase archive");
        }
        plantRes = await plantProjectZip(file, projectName || undefined);
      } else if (tab === "folder") {
        plantRes = await plantProjectZip(await createFolderArchive(), projectName || undefined);
      } else {
        if (!repoUrl.trim()) {
          throw new Error("Please provide a repository URL");
        }
        plantRes = await plantProjectUrl(repoUrl.trim(), projectName || undefined, branch || undefined);
      }

      await progressPromise;
      setCurrentStageIdx(ANALYSIS_STAGES.length - 1);
      onPlantComplete(plantRes.projectId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to plant codebase");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(34, 54, 42, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--color-sage-soft)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
          padding: 32,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>🌱</span>
              <h2 style={{ fontSize: 24, margin: 0, color: "var(--color-forest)" }}>Plant a New Project</h2>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#8a8878" }}>
              Upload a ZIP or provide a public GitHub repository. Nova Garden reads source safely and never executes project code.
            </p>
          </div>
          {!isSubmitting && (
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 22,
                color: "#8a8878",
                cursor: "pointer",
                padding: 4,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {!isSubmitting && (
          <>
            {/* Tab Selection */}
            <div
              style={{
                display: "flex",
                gap: 8,
                background: "var(--color-ivory)",
                padding: 4,
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <button
                type="button"
                onClick={() => setTab("zip")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: tab === "zip" ? "#fff" : "transparent",
                  color: tab === "zip" ? "var(--color-forest)" : "#8a8878",
                  fontWeight: tab === "zip" ? 600 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: tab === "zip" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                }}
              >
                📦 Upload ZIP Archive
              </button>
              <button
                type="button"
                onClick={() => setTab("folder")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: tab === "folder" ? "#fff" : "transparent",
                  color: tab === "folder" ? "var(--color-forest)" : "#8a8878",
                  fontWeight: tab === "folder" ? 600 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: tab === "folder" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                }}
              >
                📁 Upload Folder
              </button>
              <button
                type="button"
                onClick={() => setTab("url")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: tab === "url" ? "#fff" : "transparent",
                  color: tab === "url" ? "var(--color-forest)" : "#8a8878",
                  fontWeight: tab === "url" ? 600 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: tab === "url" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                }}
              >
                🐙 GitHub / Repository URL
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, color: "#514f45", marginBottom: 6 }}>
                  Project Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Next.js SaaS, Storefront API"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--color-sage-soft)",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {tab === "zip" ? (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#514f45", marginBottom: 6 }}>
                    Select Codebase ZIP File *
                  </label>
                  <div
                    style={{
                      border: "2px dashed var(--color-sage)",
                      borderRadius: 10,
                      padding: "24px 16px",
                      textAlign: "center",
                      background: "var(--color-ivory)",
                      cursor: "pointer",
                    }}
                    onClick={() => document.getElementById("plant-zip-input")?.click()}
                  >
                    <input
                      id="plant-zip-input"
                      type="file"
                      accept=".zip"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) setFile(e.target.files[0]);
                      }}
                    />
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📁</div>
                    {file ? (
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--color-forest)" }}>
                        {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    ) : (
                      <>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--color-forest)" }}>
                          Click to browse or drop your codebase .zip here
                        </p>
                        <span style={{ fontSize: 12, color: "#8a8878" }}>
                          ZIP is the safest format for project folders. Fullstack, frontend, backend, or monorepo archives up to 50MB.
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ) : tab === "folder" ? (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#514f45", marginBottom: 6 }}>
                    Select Project Folder *
                  </label>
                  <div
                    style={{ border: "2px dashed var(--color-sage)", borderRadius: 10, padding: "24px 16px", textAlign: "center", background: "var(--color-ivory)", cursor: "pointer" }}
                    onClick={() => folderInputRef.current?.click()}
                  >
                    <input
                      ref={(input) => {
                        folderInputRef.current = input;
                        input?.setAttribute("webkitdirectory", "");
                      }}
                      type="file"
                      multiple
                      style={{ display: "none" }}
                      onChange={(event) => setFolderFiles(Array.from(event.target.files ?? []))}
                    />
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📁</div>
                    {folderFiles.length > 0 ? (
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--color-forest)" }}>
                        {folderFiles.length} files selected from {folderFiles[0].webkitRelativePath.split("/")[0] || "project folder"}
                      </p>
                    ) : (
                      <>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--color-forest)" }}>
                          Click to select your project folder
                        </p>
                        <span style={{ fontSize: 12, color: "#8a8878" }}>
                          Dependency and build folders are excluded before your folder is packaged for analysis.
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 13, color: "#514f45", marginBottom: 6 }}>
                      GitHub Repository URL *
                    </label>
                    <input
                      type="url"
                      placeholder="https://github.com/owner/repository"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--color-sage-soft)",
                        fontSize: 14,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 13, color: "#514f45", marginBottom: 6 }}>
                      Branch (Optional, default: main)
                    </label>
                    <input
                      type="text"
                      placeholder="main"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--color-sage-soft)",
                        fontSize: 14,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </>
              )}

              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#fff0ed",
                    border: "1px solid var(--color-coral)",
                    borderRadius: 8,
                    marginBottom: 16,
                    color: "var(--color-coral)",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--color-sage-soft)",
                    background: "#fff",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "9px 20px",
                    borderRadius: 8,
                    border: "none",
                    background: "var(--color-forest)",
                    color: "var(--color-ivory)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Analyze Project
                </button>
              </div>
            </form>
          </>
        )}

        {/* In-Progress Analysis Stepper */}
        {isSubmitting && (
          <div style={{ padding: "16px 0" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
              <h3 style={{ fontSize: 18, color: "var(--color-forest)", margin: "0 0 4px" }}>
                Growing Your Garden
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#8a8878" }}>
                Reading source without executing it, mapping dependencies, and preparing your results...
              </p>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {ANALYSIS_STAGES.map((stage, idx) => {
                const isPassed = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                return (
                  <div
                    key={stage}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: isCurrent ? "var(--color-ivory)" : isPassed ? "#f4f8f0" : "#fafafa",
                      border: isCurrent
                        ? "1px solid var(--color-olive)"
                        : isPassed
                        ? "1px solid var(--color-sage-soft)"
                        : "1px solid #eee",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>
                      {isPassed ? "✅" : isCurrent ? "🔄" : "⏳"}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontFamily: "var(--font-mono)",
                        color: isCurrent
                          ? "var(--color-forest)"
                          : isPassed
                          ? "var(--color-forest)"
                          : "#8a8878",
                        fontWeight: isCurrent ? 600 : 400,
                      }}
                    >
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
