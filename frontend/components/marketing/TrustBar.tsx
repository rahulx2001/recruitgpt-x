"use client";

const TECHNOLOGIES = [
  { name: "LangGraph", mark: "LG" },
  { name: "MiniMax M3", mark: "M3" },
  { name: "FastAPI", mark: "API" },
  { name: "Qdrant", mark: "Q" },
  { name: "PostgreSQL", mark: "PG" },
  { name: "Next.js", mark: "N" },
  { name: "OpenAI Compatible", mark: "AI" },
];

function TechRow({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="lp-trust__slide" aria-hidden={ariaHidden}>
      {TECHNOLOGIES.map((tech) => (
        <div key={`${ariaHidden ? "dup-" : ""}${tech.name}`} className="lp-trust__item">
          <span className="lp-trust__mark">{tech.mark}</span>
          <span className="lp-trust__name">{tech.name}</span>
        </div>
      ))}
    </div>
  );
}

export function TrustBar() {
  return (
    <div className="lp-trust" aria-label="Built with">
      <p className="lp-trust__label">Powered by</p>
      <div className="lp-trust__track">
        <TechRow />
        <TechRow ariaHidden />
      </div>
    </div>
  );
}