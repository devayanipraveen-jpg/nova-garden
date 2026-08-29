import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ScrollStory from "../landing/ScrollStory";
import "../landing/landing.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const closingRef = useRef<HTMLDivElement>(null);
  const [showNavCta, setShowNavCta] = useState(true);

  useEffect(() => {
    const closingSection = closingRef.current;
    if (!closingSection) return;

    const observer = new IntersectionObserver(([entry]) => setShowNavCta(!entry.isIntersecting), {
      threshold: 0.25,
    });
    observer.observe(closingSection);
    return () => observer.disconnect();
  }, []);

  function enterGarden(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const viewTransitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => void;
    };

    if (viewTransitionDocument.startViewTransition) {
      viewTransitionDocument.startViewTransition(() => navigate("/garden"));
      return;
    }

    navigate("/garden");
  }

  return (
    <div>
      <nav className="landing-nav">
        <span className="landing-nav__brand"><strong>NOVA</strong> <em>garden</em></span>
        {showNavCta && (
          <Link to="/garden" className="landing-nav__cta" onClick={enterGarden}>
            Enter the garden
          </Link>
        )}
      </nav>

      <ScrollStory />

      <div ref={closingRef} className="landing-closing">
        <svg className="closing-ant-trails" viewBox="0 0 1200 700" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 36 502 C 164 430 248 482 334 564 S 524 670 640 604" />
          <g className="ant" transform="translate(172 456) rotate(24)">
            <ellipse cx={-3} cy={0} rx={2} ry={2.6} />
            <ellipse cx={1} cy={0} rx={2.3} ry={3} />
            <circle cx={4.5} cy={0} r={1.7} />
          </g>
          <g className="ant" transform="translate(402 606) rotate(20)">
            <ellipse cx={-3} cy={0} rx={2} ry={2.6} />
            <ellipse cx={1} cy={0} rx={2.3} ry={3} />
            <circle cx={4.5} cy={0} r={1.7} />
          </g>
          <path d="M 760 92 C 884 32 984 104 1022 188 S 1120 280 1182 224" />
          <g className="ant" transform="translate(888 78) rotate(-12)">
            <ellipse cx={-3} cy={0} rx={2} ry={2.6} />
            <ellipse cx={1} cy={0} rx={2.3} ry={3} />
            <circle cx={4.5} cy={0} r={1.7} />
          </g>
          <g className="ant" transform="translate(1052 222) rotate(58)">
            <ellipse cx={-3} cy={0} rx={2} ry={2.6} />
            <ellipse cx={1} cy={0} rx={2.3} ry={3} />
            <circle cx={4.5} cy={0} r={1.7} />
          </g>
        </svg>
        <h2>Grow better code.</h2>
        <p>
          Every bug you've read about here is real data from a real bug tracker, rendered as a
          living ecosystem instead of a table. Step in and see your own project this way.
        </p>
        <Link to="/garden" className="landing-closing__cta" onClick={enterGarden}>
          Enter the garden
        </Link>
      </div>
    </div>
  );
}
