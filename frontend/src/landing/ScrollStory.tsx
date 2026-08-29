import React, { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { STORY_ACTS } from "./storyActs";

gsap.registerPlugin(ScrollTrigger);

// Timeline units per act. Arbitrary — what matters is the ratio between
// hold time and transition time, not the absolute number.
const ACT_DURATION = 3;
const PX_PER_UNIT = 120; // keeps each story act to a single short scroll gesture

// x-positions of the five illustrative plants along the stage.
const PLANT_X = [160, 420, 680, 940, 1080];
const FOCUS_INDEX = 2; // "Checkout" — the plant the whole story happens to

export default function ScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useLayoutEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
  }, []);

  useLayoutEffect(() => {
    if (reducedMotion) return; // accessible fallback below skips GSAP entirely

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(containerRef);

      // Initial state — a calm, healthy garden. Everything story-specific starts hidden.
      gsap.set(q(".weed"), { opacity: 0, transformOrigin: "bottom" });
      gsap.set(q(".root-path"), { opacity: 0 });
      gsap.set(q(".scan-sweep"), { opacity: 0, x: -200 });
      gsap.set(q(".scan-label"), { opacity: 0, y: 10 });
      gsap.set(q(".impact-glow"), { opacity: 0, r: 0 });
      gsap.set(q(".dna-line"), { opacity: 0 });
      gsap.set(q(".whatif-ghost"), { opacity: 0 });
      gsap.set(q(".developer-tag"), { opacity: 0, y: 8 });
      gsap.set(q(".autopsy-card"), { opacity: 0, x: 20 });
      gsap.set(q(".memory-echo"), { opacity: 0 });
      gsap.set(q(".risk-ring"), { opacity: 0, scale: 0.6, transformOrigin: "center" });
      gsap.set(q(".season-tint"), { opacity: 0 });
      gsap.set(q(".sprout-new"), { opacity: 0, scale: 0, transformOrigin: "bottom" });
      gsap.set(q(".dashboard-mock"), { opacity: 0, scale: 0.94 });
      gsap.set(q(".world"), { y: 0 });
      gsap.set(q(".act-text"), { opacity: 0, y: 24 });
      gsap.set(q(".opening-brand"), { opacity: 0 });
      gsap.set(q(".opening-brand__nova"), { x: -90 });
      gsap.set(q(".opening-brand__garden"), { x: 90 });
      gsap.set(q(".opening-brand__trail, .opening-brand__ant"), { opacity: 0, scale: 0.6 });
      gsap.set(q(".scroll-cue"), { opacity: 0, y: 8 });

      const openingTimeline = gsap.timeline();
      openingTimeline
        .to(q(".opening-brand"), { opacity: 1, duration: 0.2 })
        .to(q(".opening-brand__nova"), { x: 0, duration: 0.55, ease: "power3.out" }, 0)
        .to(q(".opening-brand__garden"), { x: 0, duration: 0.55, ease: "power3.out" }, 0)
        .to(q(".opening-brand__trail, .opening-brand__ant"), { opacity: 1, scale: 1, duration: 0.25, stagger: 0.08 }, 0.35)
        .to(q(".opening-brand"), { opacity: 0, y: -18, duration: 0.35, ease: "power2.in" }, 1.2)
        .to(q('[data-act="hero"]'), { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 1.45)
        .to(q(".scroll-cue"), { opacity: 0.85, y: 0, duration: 0.35, ease: "power2.out" }, 1.6);

      const totalDuration = STORY_ACTS.length * ACT_DURATION;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=" + totalDuration * PX_PER_UNIT,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });

      STORY_ACTS.forEach((act, i) => {
        const t0 = i * ACT_DURATION;
        tl.addLabel(act.id, t0);

        // Text in / hold / out — every act gets the same rhythm.
        if (act.id !== "hero") {
          tl.to(q(`[data-act="${act.id}"]`), { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, t0 + 0.1);
        }
        tl.to(
          q(`[data-act="${act.id}"]`),
          { opacity: 0, y: -20, duration: 0.5, ease: "power2.in" },
          t0 + ACT_DURATION - 0.6
        );

        if (act.id === "hero") {
          tl.to(q(".scroll-cue"), { opacity: 0, duration: 0.25 }, t0 + 0.7);
        }

        // Stage-specific motion, positioned within this act's window.
        switch (act.id) {
          case "spread":
            tl.to(q(".weed"), { opacity: 1, scale: 1, stagger: 0.15, duration: 0.6 }, t0 + 0.4);
            break;

          case "scan":
            tl.to(q(".scan-sweep"), { opacity: 0.5, duration: 0.2 }, t0 + 0.2)
              .to(q(".scan-sweep"), { x: 1100, duration: 1.4, ease: "power1.inOut" }, t0 + 0.2)
              .to(q(".scan-sweep"), { opacity: 0, duration: 0.3 }, t0 + 1.6)
              .to(q(".scan-label"), { opacity: 1, y: 0, duration: 0.3 }, t0 + 1.5)
              .to(q(".scan-label"), { opacity: 0, duration: 0.3 }, t0 + 2.4);
            break;

          case "impact":
            tl.to(q(".impact-glow"), { opacity: 0.5, r: 260, duration: 1.4, ease: "power2.out" }, t0 + 0.3)
              .to(q(".root-path"), { opacity: 1, duration: 0.8 }, t0 + 0.3)
              .to(q(".root-path"), { stroke: "#5D3827", duration: 0.6 }, t0 + 0.8);
            break;

          case "dna":
            tl.to(q(".dna-line"), { opacity: 0.7, stagger: 0.12, duration: 0.5 }, t0 + 0.3);
            break;

          case "root_cause":
            // Camera drops underground — translate the whole world group up
            // so the (already-drawn) root network below the soil comes into frame.
            tl.to(q(".world"), { y: -430, duration: 1.2, ease: "power2.inOut" }, t0 + 0.1)
              .to(q(".root-path"), { stroke: "#5D3827", duration: 0.4 }, t0 + 1.2)
              .to(q(".world"), { y: 0, duration: 1, ease: "power2.inOut" }, t0 + ACT_DURATION - 1);
            break;

          case "whatif":
            tl.to(q(".whatif-ghost"), { opacity: 0.55, stagger: 0.2, duration: 0.6 }, t0 + 0.4);
            break;

          case "developer":
            tl.to(q(".developer-tag"), { opacity: 1, y: 0, duration: 0.5 }, t0 + 0.4);
            break;

          case "autopsy":
            tl.to(q(".autopsy-card"), { opacity: 1, x: 0, duration: 0.5 }, t0 + 0.4);
            break;

          case "memory":
            tl.to(q(".memory-echo"), { opacity: 0.6, duration: 0.6 }, t0 + 0.4);
            break;

          case "seasons":
            tl.to(q(".season-tint"), { opacity: 0.16, duration: 0.4 }, t0 + 0.2)
              .to(q(".season-tint"), { fill: "#A9A85B", duration: 0.5 }, t0 + 0.7)
              .to(q(".season-tint"), { fill: "#B98F52", duration: 0.5 }, t0 + 1.4)
              .to(q(".season-tint"), { fill: "#9FB0BE", duration: 0.5 }, t0 + 2.1);
            break;

          case "risk":
            tl.to(q(".risk-ring"), { opacity: 0.8, scale: 1.15, duration: 0.7, ease: "power1.out" }, t0 + 0.3)
              .to(q(".risk-ring"), { scale: 0.95, duration: 0.6, ease: "power1.inOut" }, t0 + 1.0)
              .to(q(".risk-ring"), { scale: 1.1, duration: 0.6, ease: "power1.inOut" }, t0 + 1.6);
            break;

          case "resolution":
            tl.to(q(".weed"), { opacity: 0, scale: 0.4, stagger: 0.08, duration: 0.5 }, t0 + 0.3)
              .to(q(".root-path"), { opacity: 0.25, stroke: "#5D3827", duration: 0.5 }, t0 + 0.3)
              .to(q(".impact-glow, .risk-ring, .season-tint"), { opacity: 0, duration: 0.4 }, t0 + 0.3)
              .to(q(".plant-leaf"), { fill: "#6E9B5C", duration: 0.6 }, t0 + 0.5)
              .to(q(".sprout-new"), { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, t0 + 1.1);
            break;

          case "transform":
            tl.to(q(".plant, .root-path, .sprout-new"), { opacity: 0, duration: 0.7 }, t0 + 0.2)
              .to(q(".dashboard-mock"), { opacity: 1, scale: 1, duration: 1, ease: "power2.out" }, t0 + 0.5);
            break;
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <div className="scroll-stage scroll-stage--static">
        {STORY_ACTS.map((act) => (
          <section key={act.id} className="act-text act-text--static">
            <p className="act-eyebrow">{act.eyebrow}</p>
            <h2 className="act-title">{act.title}</h2>
            <p className="act-body">{act.body}</p>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="scroll-stage">
      <svg viewBox="0 0 1200 700" className="stage-svg" role="img" aria-label="Animated illustration of a codebase garden responding to a bug being found, understood, and resolved">
        <rect x={0} y={0} width={1200} height={700} fill="var(--color-ivory)" />
        <rect className="season-tint" x={0} y={0} width={1200} height={700} fill="#6E9B5C" />

        <g className="world">
          {/* ---- Surface (0–560) ---- */}
          <rect x={0} y={560} width={1200} height={140} fill="var(--color-soil)" />

          {/* Underground root network, drawn once, revealed via opacity + the camera dip */}
          <g className="roots-layer">
            {PLANT_X.map((x, i) =>
              i === PLANT_X.length - 1 ? null : (
                <path
                  key={i}
                  className="root-path"
                  d={`M ${x} 620 Q ${(x + PLANT_X[i + 1]) / 2} 760 ${PLANT_X[i + 1]} 620`}
                  stroke="#5D3827"
                  strokeWidth={3}
                  fill="none"
                />
              )
            )}
            <path
              className="root-path"
              d={`M ${PLANT_X[FOCUS_INDEX]} 620 Q ${PLANT_X[FOCUS_INDEX] - 60} 820 ${PLANT_X[FOCUS_INDEX] - 140} 900`}
              stroke="#5D3827"
              strokeWidth={2.5}
              fill="none"
            />
            <circle
              className="root-path"
              cx={PLANT_X[FOCUS_INDEX] - 140}
              cy={900}
              r={10}
              fill="#5D3827"
            />
            <text x={PLANT_X[FOCUS_INDEX] - 140} y={935} textAnchor="middle" className="root-path" fontFamily="var(--font-mono)" fontSize={13} fill="#3E5C3F">
              Authentication
            </text>
          </g>

          {/* Impact radius glow, centered on the focus plant */}
          <circle className="impact-glow" cx={PLANT_X[FOCUS_INDEX]} cy={620} r={0} fill="#D9603B" opacity={0} />

          {/* Bug DNA connective lines between weed clusters */}
          {PLANT_X.map((x, i) =>
            i === PLANT_X.length - 1 ? null : (
              <line
                key={i}
                className="dna-line"
                x1={x}
                y1={545}
                x2={PLANT_X[i + 1]}
                y2={545}
                stroke="#6E7B4F"
                strokeWidth={1.5}
                strokeDasharray="4 5"
              />
            )
          )}

          {/* Plants */}
          {PLANT_X.map((x, i) => (
            <g className="plant" key={i}>
              <path
                d={`M ${x} 560 Q ${x + 6} 480 ${x} 420`}
                stroke="#3E5C3F"
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
              />
              {[0, 1, 2, 3].map((leafI) => {
                const side = leafI % 2 === 0 ? 1 : -1;
                const leafY = 500 - leafI * 24;
                return (
                  <ellipse
                    key={leafI}
                    className="plant-leaf"
                    cx={x + side * (16 + leafI * 3)}
                    cy={leafY}
                    rx={14}
                    ry={7}
                    fill="#6E9B5C"
                    transform={`rotate(${side * 22} ${x + side * (16 + leafI * 3)} ${leafY})`}
                  />
                );
              })}

              {/* Weeds at this plant */}
              {[0, 1].map((wi) => (
                <g className="weed" key={wi} opacity={0}>
                  <line
                    x1={x - 22 + wi * 14}
                    y1={560}
                    x2={x - 18 + wi * 14}
                    y2={534}
                    stroke="#B4562F"
                    strokeWidth={2.5}
                  />
                  <circle cx={x - 18 + wi * 14} cy={531} r={4.5} fill="#D9603B" />
                </g>
              ))}

              {i === FOCUS_INDEX && (
                <g className="sprout-new" opacity={0}>
                  <path d={`M ${x + 34} 560 Q ${x + 40} 540 ${x + 34} 522`} stroke="#3E5C3F" strokeWidth={3} fill="none" />
                  <ellipse cx={x + 34} cy={520} rx={8} ry={5} fill="#8FA37E" />
                </g>
              )}
            </g>
          ))}

          {/* What-if propagation ghosts — dashed outline weeds on the neighbouring plants */}
          {[PLANT_X[FOCUS_INDEX - 1], PLANT_X[FOCUS_INDEX + 1]].map((x, i) => (
            <g className="whatif-ghost" key={i} opacity={0}>
              <line x1={x} y1={560} x2={x + 4} y2={536} stroke="#D9603B" strokeWidth={2} strokeDasharray="2 3" />
              <circle cx={x + 4} cy={533} r={4} fill="none" stroke="#D9603B" strokeWidth={1.5} strokeDasharray="2 2" />
            </g>
          ))}

          {/* Risk pulse ring around the focus plant */}
          <circle
            className="risk-ring"
            cx={PLANT_X[FOCUS_INDEX]}
            cy={560}
            r={70}
            fill="none"
            stroke="#D9603B"
            strokeWidth={2}
            opacity={0}
          />

          {/* Memory echo — a faint past occurrence of the same weed pattern */}
          <g className="memory-echo" opacity={0}>
            <line x1={PLANT_X[FOCUS_INDEX] - 60} y1={560} x2={PLANT_X[FOCUS_INDEX] - 56} y2={538} stroke="#8a8878" strokeWidth={2} strokeDasharray="2 3" />
            <circle cx={PLANT_X[FOCUS_INDEX] - 56} cy={535} r={4} fill="none" stroke="#8a8878" strokeWidth={1.5} />
            <text x={PLANT_X[FOCUS_INDEX] - 56} y={520} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill="#8a8878">
              seen before
            </text>
          </g>

          {/* Developer tag */}
          <g className="developer-tag" opacity={0}>
            <circle cx={PLANT_X[FOCUS_INDEX] + 70} cy={470} r={16} fill="#fff" stroke="#6E7B4F" strokeWidth={1.5} />
            <text x={PLANT_X[FOCUS_INDEX] + 70} y={475} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={12} fill="#3E5C3F">
              CE
            </text>
            <text x={PLANT_X[FOCUS_INDEX] + 70} y={498} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill="#514f45">
              Checkout expert
            </text>
          </g>
        </g>

        {/* Scan sweep — screen-space, not part of .world */}
        <rect className="scan-sweep" x={-40} y={0} width={40} height={700} fill="url(#scanGradient)" opacity={0} />
        <defs>
          <linearGradient id="scanGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#D9603B" stopOpacity="0" />
            <stop offset="50%" stopColor="#D9603B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#D9603B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <text className="scan-label" x={600} y={120} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={22} fill="#D9603B" opacity={0}>
          BUG DETECTED — Checkout
        </text>

        {/* Autopsy card */}
        <g className="autopsy-card" opacity={0}>
          <rect x={860} y={180} width={260} height={128} rx={10} fill="#fff" stroke="var(--color-sage-soft)" />
          <text x={880} y={210} fontFamily="var(--font-mono)" fontSize={11} fill="#8a8878">BUG AUTOPSY</text>
          <text x={880} y={234} fontFamily="var(--font-body)" fontSize={13} fill="var(--color-charcoal)">Cause: session validation</text>
          <text x={880} y={256} fontFamily="var(--font-body)" fontSize={13} fill="var(--color-charcoal)">Origin: Authentication</text>
          <text x={880} y={278} fontFamily="var(--font-body)" fontSize={13} fill="var(--color-charcoal)">Prevention: add regression test</text>
        </g>

        {/* Dashboard mock — the payoff: garden becomes the actual product UI */}
        <g className="dashboard-mock" opacity={0}>
          <rect x={120} y={90} width={960} height={520} rx={16} fill="#fff" stroke="var(--color-sage-soft)" />
          <rect x={120} y={90} width={960} height={56} rx={16} fill="var(--color-ivory-deep)" />
          <text x={148} y={124} fontFamily="var(--font-display)" fontSize={18} fill="var(--color-forest)">NOVA garden</text>
          <rect x={148} y={172} width={200} height={90} rx={8} fill="var(--color-ivory)" stroke="var(--color-sage-soft)" />
          <text x={166} y={200} fontFamily="var(--font-mono)" fontSize={11} fill="#8a8878">PROJECT HEALTH</text>
          <text x={166} y={234} fontFamily="var(--font-display)" fontSize={26} fill="var(--color-forest)">78</text>
          <rect x={368} y={172} width={200} height={90} rx={8} fill="var(--color-ivory)" stroke="var(--color-sage-soft)" />
          <text x={386} y={200} fontFamily="var(--font-mono)" fontSize={11} fill="#8a8878">ACTIVE BUGS</text>
          <text x={386} y={234} fontFamily="var(--font-display)" fontSize={26} fill="var(--color-forest)">4</text>
          <rect x={588} y={172} width={200} height={90} rx={8} fill="var(--color-ivory)" stroke="var(--color-sage-soft)" />
          <text x={606} y={200} fontFamily="var(--font-mono)" fontSize={11} fill="#8a8878">CRITICAL</text>
          <text x={606} y={234} fontFamily="var(--font-display)" fontSize={26} fill="#D9603B">1</text>
          <rect x={148} y={292} width={824} height={270} rx={8} fill="var(--color-ivory)" stroke="var(--color-sage-soft)" />
          <text x={166} y={318} fontFamily="var(--font-mono)" fontSize={11} fill="#8a8878">LIVE ECOSYSTEM VIEW</text>
        </g>
      </svg>

      <div className="opening-brand" aria-label="NOVA garden">
        <div className="opening-brand__topline">
          <span className="opening-brand__nova">NOVA</span>
          <span className="opening-brand__trail">...</span>
          <span className="opening-brand__ant" aria-hidden="true" />
        </div>
        <em className="opening-brand__garden">garden</em>
      </div>

      <div className="stage-text-layer">
        {STORY_ACTS.map((act) => (
          <div key={act.id} className={`act-text act-text--${act.align ?? "left"}`} data-act={act.id}>
            {act.id === "hero" ? (
              <p className="hero-brand hero-brand--compact" aria-label="NOVA garden">
                <span>NOVA</span><em>garden</em>
              </p>
            ) : (
              <p className="act-eyebrow">{act.eyebrow}</p>
            )}
            <h2 className="act-title">{act.title}</h2>
            <p className="act-body">{act.body}</p>
          </div>
        ))}
      </div>
      <div className="scroll-cue" aria-hidden="true">
        <span>Scroll to explore</span>
        <span className="scroll-cue__arrow">↓</span>
      </div>
    </div>
  );
}
