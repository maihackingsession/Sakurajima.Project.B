"use client";

import { createContext, useContext, useEffect, useId, useRef } from "react";
import CraneMark from "./CraneMark";

/** A task that is open on a screen: the slim focus bar replaces the masthead. */
export type FocusInfo = { title: string; status?: string; onBack: () => void };
export type FocusEntry = FocusInfo & { area: string };

type Register = (id: string, f: FocusEntry | null) => void;
const FocusContext = createContext<Register>(() => {});
export const FocusProvider = FocusContext.Provider;

/**
 * Registers an open task of an area (tab). `null` = overview, the full masthead shows.
 * Only the visible area's task is shown by the page.
 */
export function useFocus(area: string, focus: FocusInfo | null) {
  const register = useContext(FocusContext);
  const id = useId();
  const back = useRef<() => void>(() => {});
  useEffect(() => {
    if (focus) back.current = focus.onBack;
  });
  const title = focus?.title;
  const status = focus?.status;
  const active = !!focus;
  useEffect(() => {
    register(id, active ? { area, title: title ?? "", status, onBack: () => back.current() } : null);
  }, [register, id, area, active, title, status]);
  useEffect(() => () => register(id, null), [register, id]);
}

/** Slim bar: 4px accent line, „← Zurück“, task title, save status. No tabs, no nameplate. */
export function FocusBar({ focus }: { focus: FocusEntry }) {
  return (
    <header className="focus-bar sticky top-0 z-20 bg-[var(--paper)]">
      <div aria-hidden className="h-1 bg-[var(--accent)]" />
      <div className="mx-auto grid min-h-[52px] max-w-[1120px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-[var(--rule)] px-[18px] font-sans text-[14px] min-[600px]:px-6">
        <button onClick={focus.onBack} className="inline-flex min-h-11 items-center gap-2 justify-self-start font-semibold text-[var(--ink)] hover:text-[var(--accent)]">
          <span aria-hidden>←</span> Zurück
        </button>
        <p className="flex min-w-0 items-center gap-2 truncate font-bold">
          <CraneMark size="sm" />
          <span className="truncate">{focus.title}</span>
        </p>
        <p role="status" aria-live="polite" className="justify-self-end truncate text-[13px] text-[var(--grey)]">
          {focus.status ? <span key={focus.status} className="fade-in">{focus.status}</span> : null}
        </p>
      </div>
    </header>
  );
}
