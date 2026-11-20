"use client";

import { useEffect, useState } from "react";

export default function Header() {
  const [mock, setMock] = useState(false);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setMock(!!d.mock))
      .catch(() => {});
  }, []);

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex w-full max-w-2xl items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xl font-bold text-neutral-900">Bauleiter-Assistent</p>
          <p className="text-sm text-neutral-600">Ein Assistent für den Bauleiter – kein Ersatz.</p>
        </div>
        {mock && (
          <span className="shrink-0 rounded-md bg-neutral-200 px-2 py-1 text-xs font-medium text-neutral-700">
            Demo-Modus (ohne KI)
          </span>
        )}
      </div>
    </header>
  );
}
