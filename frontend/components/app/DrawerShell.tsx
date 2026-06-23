"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function DrawerShell({
  title,
  subtitle,
  ariaLabel,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  ariaLabel: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    document.body.classList.add("scorecard-open");
    return () => document.body.classList.remove("scorecard-open");
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="scorecard-overlay">
      <button
        type="button"
        className="scorecard-overlay__backdrop"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside className="scorecard-drawer" aria-label={ariaLabel}>
        <div className="scorecard-drawer__head">
          <div>
            <h2 className="panel__title">{title}</h2>
            {subtitle ? <p className="panel__subtitle">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn--icon"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>
        <div className="scorecard-drawer__body">{children}</div>
        {footer ? <div className="scorecard-drawer__foot">{footer}</div> : null}
      </aside>
    </div>,
    document.body
  );
}