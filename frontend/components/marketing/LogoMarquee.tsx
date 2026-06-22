"use client";

import { Reveal } from "./Reveal";

const LOGOS = [
  "LangGraph",
  "MiniMax M3",
  "BGE-Large",
  "Qdrant",
  "FastAPI",
  "Next.js",
  "LangGraph",
  "MiniMax M3",
  "BGE-Large",
  "Qdrant",
  "FastAPI",
  "Next.js",
];

export function LogoMarquee() {
  return (
    <Reveal direction="none">
      <div className="nex-logos" aria-label="Built with">
        <div className="nex-logos__track">
          <div className="nex-logos__slide">
            {LOGOS.map((name, i) => (
              <div key={`${name}-${i}`} className="nex-logos__item">
                <span className="nex-logos__dot" aria-hidden />
                {name}
              </div>
            ))}
          </div>
          <div className="nex-logos__slide" aria-hidden>
            {LOGOS.map((name, i) => (
              <div key={`dup-${name}-${i}`} className="nex-logos__item">
                <span className="nex-logos__dot" aria-hidden />
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}