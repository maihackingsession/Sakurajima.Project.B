"use client";

import { useEffect, useRef, useState } from "react";
import { getPhoto } from "../lib/store";
import { greyLink } from "../lib/ui";

/** Shrinks a photo in the browser to max. 1280 px and returns a JPEG. */
export async function resizePhoto(file: File, max = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
  if (!blob) throw new Error("no jpeg");
  return blob;
}

/** Square preview without rounding: from a stored photo id or a not yet saved blob. */
export function Thumb({ id, blob, size = 72 }: { id?: string; blob?: Blob | null; size?: number }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let alive = true;
    let made = "";
    void (async () => {
      const b = blob ?? (id ? await getPhoto(id) : null);
      if (!alive || !b) return;
      made = URL.createObjectURL(b);
      setUrl(made);
    })();
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [id, blob]);
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element -- local blob URL, no optimisation possible
  return <img src={url} alt="Foto zum Eintrag" width={size} height={size} className="block border border-[var(--rule)] object-cover" style={{ width: size, height: size }} />;
}

/** „+ Foto“: camera on phones, file picker elsewhere. */
export function PhotoButton({ onPhoto }: { onPhoto: (blob: Blob) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  return (
    <>
      <button type="button" className={`${greyLink} text-[13px]`} onClick={() => input.current?.click()}>+ Foto</button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setError("");
          try {
            onPhoto(await resizePhoto(f));
          } catch {
            setError("Foto konnte nicht gelesen werden.");
          }
        }}
      />
      {error && <span role="alert" className="font-sans text-[13px] text-[var(--urgent)]">{error}</span>}
    </>
  );
}
