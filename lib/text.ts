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
