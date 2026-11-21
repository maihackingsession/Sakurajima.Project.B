"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import project from "@/data/project.json";
import { isBeispiel } from "../lib/api";
import { Crane } from "./Crane";

const noop = () => () => {};

/** Amber header: crane logo, name, project, Beispielmodus label; the tab tiles sit in it (below on phones). */
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
    <header className="bg-[var(--accent)] text-[var(--ink)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col px-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="flex min-w-0 items-center gap-3 py-3 lg:py-4">
          <Crane size={44} />
          <div className="min-w-0 leading-tight">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[22px] font-extrabold tracking-tight">Baufrist</span>
              {(beispiel || serverMock) && (
                <span className="rounded-full border border-[var(--ink)] bg-white px-2 py-0.5 text-[13px] leading-tight font-semibold">
                  Beispielmodus (offline)
                </span>
              )}
            </p>
            <p className="truncate text-sm font-medium lg:max-w-[300px]">{project.bauvorhaben}</p>
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}
