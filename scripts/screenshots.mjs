// Clicks through every screen in Beispielmodus (?beispiel=1, no AI calls) with headless Edge
// and saves screenshots at 1280×720 and 375×812. Also reports console errors.
// Uses the Chrome DevTools Protocol over Node's built-in WebSocket – no extra dependencies.
//
// Usage: node scripts/screenshots.mjs <baseUrl> <outDir> [--scale=2] [--only=entwurf,freigegeben]

import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const [base = "http://localhost:3000", outDir = "docs/screenshots/review"] = args.filter((a) => !a.startsWith("--"));
const scale = Number(opt("scale") || 1);
const only = opt("only")?.split(",");
// --live: real AI (no ?beispiel=1), hero story only, desktop only, prints the waiting time per step.
const live = args.includes("--live");
const timings = [];
const EDGE = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 720, mobile: false },
  { name: "mobile", width: 375, height: 812, mobile: true },
  { name: "tablet", width: 768, height: 1024, mobile: true },
].slice(0, args.includes("--live") ? 1 : args.includes("--tablet") ? 3 : 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const profile = path.join(os.tmpdir(), `baufrist-shots-${Date.now()}`);
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(EDGE, [`--headless=new`, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--disable-gpu", "about:blank"], { stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return { proc, profile, ws: page.webSocketDebuggerUrl };
    } catch {}
    await sleep(200);
  }
  throw new Error("Edge did not start");
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) listeners.forEach((l) => l(msg));
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  return new Promise((r) => (ws.onopen = () => r({ send, on: (l) => listeners.push(l), close: () => ws.close() })));
}

// Helpers injected into the page.
const HELPERS = `
window.__q = (text) => [...document.querySelectorAll("button, summary, a")].find((b) => b.offsetParent !== null && b.textContent.replace(/\\s+/g, " ").trim().includes(text));
window.__click = (text) => { const b = __q(text); if (!b) throw new Error("no button: " + text); b.click(); return true; };
window.__type = (sel, value) => {
  const el = [...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null);
  if (!el) throw new Error("no field: " + sel);
  const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
};
window.__has = (text) => document.body.innerText.toLowerCase().includes(text.toLowerCase());
// The situation box opens on click („Hier schreiben …“).
window.__write = (value) => { if (!document.querySelector("#situation")) __click("Hier schreiben"); return true; };
`;

async function run() {
  await mkdir(outDir, { recursive: true });
  const { proc, profile, ws } = await launch();
  const cdp = await connect(ws);
  const errors = [];
  cdp.on((m) => {
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errors.push(m.params.entry.text + " " + (m.params.entry.url || ""));
  });
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Page.enable");

  const js = async (expr) => {
    const r = await cdp.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const waitFor = async (text, ms = live ? 90000 : 8000) => {
    for (let t = 0; t < ms; t += 150) {
      if (await js(`document.body.innerText.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}) || [...document.querySelectorAll("textarea")].some((t) => t.value.includes(${JSON.stringify(text)}))`)) return;
      await sleep(150);
    }
    throw new Error(`timeout waiting for "${text}"`);
  };
  const open = async () => {
    await cdp.send("Page.navigate", { url: live ? `${base}/` : `${base}/?beispiel=1` });
    await sleep(400);
    await waitFor("Was ist auf der Baustelle passiert?", 30000);
    await js(HELPERS);
    await sleep(300);
  };

  for (const vp of VIEWPORTS) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: scale, mobile: vp.mobile });
    const shot = async (name, full = false) => {
      if (only && !only.includes(name)) return;
      // Let fade/slide-in animations finish (loader shots stay quick).
      await sleep(name.includes("laden") ? 250 : 900);
      // Design checks: no horizontal scroll, no text under 13 px, no rounded corners / shadows (except .dot).
      const issues = await js(`(() => {
        const out = [];
        if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push("horizontal scroll " + document.documentElement.scrollWidth + "px");
        for (const el of document.querySelectorAll("body *")) {
          if (el.closest(".print-sheet, svg") || !el.offsetParent) continue;
          const cs = getComputedStyle(el);
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (own && parseFloat(cs.fontSize) < 13) out.push("text " + cs.fontSize + ": " + el.textContent.trim().slice(0, 30));
          if (!el.classList.contains("dot") && cs.borderRadius !== "0px") out.push("radius " + el.tagName);
          if (cs.boxShadow !== "none") out.push("shadow " + el.tagName);
        }
        return [...new Set(out)].slice(0, 5).join("; ");
      })()`);
      if (issues) errors.push(`[${vp.name}] ${name}: ${issues}`);
      let clip;
      if (full) {
        const m = await cdp.send("Page.getLayoutMetrics");
        clip = { x: 0, y: 0, width: vp.width, height: Math.ceil(m.cssContentSize.height), scale: 1 };
      }
      const r = await cdp.send("Page.captureScreenshot", { format: "png", ...(clip ? { clip, captureBeyondViewport: true } : {}) });
      const file = path.join(outDir, `${vp.name}-${name}${full ? "-ganz" : ""}.png`);
      await writeFile(file, Buffer.from(r.data, "base64"));
      console.log("  ", file);
    };
    const step = async (label, fn) => {
      try {
        await fn();
      } catch (e) {
        errors.push(`[${vp.name}] Schritt "${label}": ${e.message}`);
        console.log(`   FEHLER ${label}: ${e.message}`);
      }
    };
    console.log(vp.name);

    await step("hauptseite", async () => {
      await open();
      // Start every viewport with an empty Verlauf (same browser profile for both viewports).
      await js("localStorage.clear(); true");
      await open();
      await shot("01-hauptseite");
    });
    await step("tagesbericht", async () => {
      await js(`__click("Tagesbericht")`);
      await sleep(200);
      await shot("02-tagesbericht-leer");
      await js(`__click("Beispiel laden")`);
      await waitFor("BAUTAGESBERICHT");
      await js(`__click("Bericht prüfen")`);
      let t = Date.now();
      await sleep(150);
      await shot("03-laden");
      await waitFor("Anzeige entwerfen");
      timings.push(["Tagesbericht prüfen → Abweichungskarte", Date.now() - t]);
      await js(`window.scrollTo(0, 0)`);
      await shot("04-abweichung");
      await shot("04-abweichung", true);
    });
    await step("rueckfrage", async () => {
      await js(`__click("Anzeige entwerfen")`);
      let t = Date.now();
      await waitFor(live ? "Schreiben erstellen" : "Eine Angabe fehlt");
      timings.push(["Anzeige entwerfen → Rückfrage", Date.now() - t]);
      if (live) console.log("   Rückfragen:", await js(`[...document.querySelectorAll("main label[for^=q]")].map((l) => l.textContent).join(" | ") || "keine"`));
      await shot("05-rueckfrage");
      if (await js(`!!document.querySelector("input[id=q0]")`)) await js(`__type("input[id=q0]", document.querySelector("input[id=q0]").placeholder.replace(/^z. B. /, ""))`);
      await js(`__click("Schreiben erstellen")`);
      t = Date.now();
      await waitFor("Randnotizen");
      timings.push(["Schreiben erstellen → Entwurf", Date.now() - t]);
      await js(`window.scrollTo(0, 0)`);
      await shot("06-entwurf");
      await shot("06-entwurf", true);
    });
    await step("kosten", async () => {
      await js(`__type("#cost-days", "5")`);
      await sleep(1300); // amount counts up for 0.9 s
      if (!(await js(`__has("9.280 €")`))) throw new Error("5 Tage ergeben nicht 9.280 €");
      await js(`__type("#cost-days", "1")`);
    });
    await step("freigabe", async () => {
      await js(`__click("Freigeben")`);
      await sleep(150);
      await js(`__click("Freigabe bestätigen")`);
      await waitFor("Freigegeben · ");
      await js(`window.scrollTo(0, 0)`);
      await shot("07-freigegeben");
    });
    await step("verlauf", async () => {
      await js(`__click("Fristen & Verlauf")`);
      await waitFor("Anstehende Fristen");
      await js(`window.scrollTo(0, 0)`);
      await shot("11-verlauf");
      await js(`__click("Frist zur Abhilfe")`);
      await waitFor("Zurück zu Fristen");
      await shot("12-verlauf-schreiben");
      await js(`__click("Zurück zu Fristen")`);
      await sleep(150);
      await js(`__click("Verlauf löschen")`);
      await sleep(150);
      await shot("13-verlauf-loeschen");
      await js(`__click("Ja, löschen")`);
      await waitFor(live ? "Noch keine freigegebenen" : "zwei Beispiele");
      await shot("14-verlauf-leer");
    });
    if (live) continue;
    await step("keine-anzeige", async () => {
      await open();
      await js(`__write()`);
      await sleep(100);
      await js(`__type("#situation", "Kran heute 2 Stunden ausgefallen, keine Auswirkung auf den Bauablauf, Puffer reicht.")`);
      await js(`__click("Analysieren")`);
      await waitFor("Trotzdem Entwurf erstellen");
      await shot("08-keine-anzeige");
    });
    await step("zusammenfassen", async () => {
      await open();
      await js(`__click("Zusammenfassen")`);
      await sleep(200);
      await js(`__click("Beispiel laden: Protokoll")`);
      await waitFor("Protokoll Baubesprechung");
      await js(`[...document.querySelectorAll("main button")].filter(b => b.offsetParent && b.textContent.trim() === "Zusammenfassen").pop().click()`);
      await waitFor("Fristen und Termine");
      await js(`window.scrollTo(0, 0)`);
      await shot("09-zusammenfassen");
    });
    await step("fehler", async () => {
      await open();
      await js(`window.fetch = () => Promise.reject(new TypeError("offline")); true`);
      await js(`__write()`);
      await sleep(100);
      await js(`__type("#situation", "Bewehrungspläne fehlen")`);
      await js(`__click("Analysieren")`);
      await waitFor("Erneut versuchen");
      await shot("10-fehler");
    });
  }

  if (timings.length) console.log("\nWartezeiten:\n" + timings.map(([k, ms]) => `- ${k}: ${(ms / 1000).toFixed(1)} s`).join("\n"));
  cdp.close();
  proc.kill();
  await sleep(500);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
  // The "fehler" step forces failed requests on purpose; ignore those.
  const real = errors.filter((e) => !/offline|Failed to fetch/i.test(e));
  console.log(real.length ? `\nKonsolenfehler / Probleme:\n- ${real.join("\n- ")}` : "\nKeine Konsolenfehler.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
