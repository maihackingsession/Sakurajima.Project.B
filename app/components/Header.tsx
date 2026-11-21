"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import project from "@/data/project.json";
import { isBeispiel } from "../lib/api";

const noop = () => () => {};

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <rect width="40" height="40" rx="9" fill="#1f2a44" />
      <path d="M11 31V10h19M11 10l6 6M11 15h4M24 10v8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="20.5" y="18" width="7" height="5.5" rx="1" fill="#e8710a" />
      <path d="M7 31h12" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Header({ children }: { children?: React.ReactNode }) {
  const [serverMock, setServerMock] = useState(false);
  const beispiel = useSyncExternalStore(noop, isBeispiel, () => false);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setServerMock(!!d.mock))
      .catch(() => {});
  }, []);

  return (
    <header className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:py-0">
        <div className="flex min-w-0 items-center gap-3 md:py-3">
          <Logo />
          <div className="min-w-0 leading-tight">
            <p className="text-lg font-bold text-[var(--navy)]">
              Baufrist <span className="hidden text-sm font-medium text-[var(--muted)] sm:inline">Bauleiter-Assistent</span>
            </p>
            <p className="truncate text-sm text-[var(--muted)] md:max-w-[200px] xl:max-w-[260px]">{project.bauvorhaben}</p>
          </div>
        </div>
        {children}
        {(beispiel || serverMock) && (
          <span className="shrink-0 rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] px-2.5 py-1 text-center text-sm leading-tight font-semibold text-[var(--warning-text)] sm:px-3">
            Beispielmodus (offline)
          </span>
        )}
      </div>
    </header>
  );
}
