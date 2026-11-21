// Text clean-up shared by server and browser.

/** Removes lines like "[ENTWURF – zur Prüfung durch den Bauleiter]" that the model may add to the text. */
export function stripDraftLines(text: string) {
  return text
    .split("\n")
    .filter((line) => !/^[\s*_[(]*entwurf\b/i.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Removes "ENTWURF" markers from a subject line ("ENTWURF – …", "… – ENTWURF zur Prüfung", "(ENTWURF …)"). */
export function stripDraftSubject(subject: string) {
  return stripDraftLines(
    subject
      .replace(/\s*\((?:ENTWURF|Entwurf)[^)]*\)/g, "")
      .replace(/^\s*ENTWURF\s*[–-]\s*/i, "")
      .replace(/\s*[–-]\s*ENTWURF\b[^\n]*$/gim, ""),
  );
}

const SIGNOFF = /^(?:mit (?:freundlichen|besten|kollegialen) grü(?:ß|ss)en|freundliche grü(?:ß|ss)e|viele grü(?:ß|ss)e|hochachtungsvoll|i\.\s?a\.|i\.\s?v\.|ppa\.)/i;

/**
 * Removes a greeting/closing and signature the model may have appended to the body
 * ("Mit freundlichen Grüßen", company, name, function). The app adds the closing and
 * the signature block itself, so they appear exactly once.
 */
export function stripSignoff(text: string, signatureLines: string[] = []) {
  const lines = text.replace(/\s+$/, "").split("\n");
  const cut = lines.findIndex((l, i) => i >= lines.length - 8 && SIGNOFF.test(l.trim()));
  if (cut > 0) return lines.slice(0, cut).join("\n").trim();
  // No closing line: drop trailing lines that only repeat the signature block.
  const sig = new Set(signatureLines.map((s) => s.trim().toLowerCase()).filter(Boolean));
  while (lines.length > 1 && (lines[lines.length - 1].trim() === "" || sig.has(lines[lines.length - 1].trim().toLowerCase()))) lines.pop();
  return lines.join("\n").trim();
}
