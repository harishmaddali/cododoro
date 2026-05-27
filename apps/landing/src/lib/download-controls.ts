import { detectPlatform, startDownload } from "./download-client";
import type { Platform } from "./github-releases";

type DownloadEl = HTMLButtonElement | HTMLAnchorElement;

const OS_LABEL: Record<Platform, string> = {
  macOS: "macOS",
  Windows: "Windows",
  Linux: "Linux",
};

const OS_ICON_SVG: Record<Platform, string> = {
  macOS: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.5c-.02-2.06 1.69-3.05 1.76-3.1-.96-1.4-2.46-1.6-3-1.62-1.27-.13-2.5.75-3.14.75-.66 0-1.66-.74-2.74-.72-1.4.02-2.7.82-3.43 2.08-1.47 2.54-.37 6.3 1.05 8.37.7 1 1.5 2.13 2.58 2.09 1.04-.04 1.43-.67 2.69-.67s1.61.67 2.72.65c1.12-.02 1.83-1.02 2.5-2.04.8-1.16 1.1-2.28 1.12-2.34-.02-.01-2.15-.83-2.18-3.45zM15.07 6.4c.55-.66.92-1.6.82-2.5-.79.03-1.78.53-2.34 1.2-.51.58-.96 1.5-.84 2.37.88.07 1.79-.44 2.36-1.07z"/></svg>`,
  Windows: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5.4 11 4.4v7.6H3zM12 4.3 21 3v9H12zM3 12.9h8v6.7L3 18.6zM12 13h9v8l-9-1.3z"/></svg>`,
  Linux: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c-1.3 0-2.5.8-2.5 2.4 0 .3 0 .8.1 1.2-.4.4-.8.7-1.2 1.3-.6 1-.7 2.2-.7 3.4 0 .9.3 1.6.3 2.4-.4.9-1.5 1.6-1.9 2.6-.6 1.4-.3 2.7.7 3.4.1.7.6 1.4 1.5 1.8 1 .5 2.5.5 4 .5s2.6-.1 3.4-.5c.7-.3 1-1 1.2-1.7 1.2-.5 1.7-1.7 1.3-3.2-.4-1.4-1.7-2.4-2.4-3.5-.3-.5-.3-1.4-.3-2.3 0-1.2-.2-2.4-.8-3.3-.5-.7-1-.9-1.4-1.4.1-.4.2-.9.2-1.2 0-1.6-1.2-2.4-2.5-2.4zm-.7 3c.4 0 .7.4.7.9 0 .3-.2.6-.4.7.1-.2-.1-.4-.3-.4-.3 0-.5.3-.5.6 0 .1 0 .2.1.3-.3-.1-.5-.4-.5-.8 0-.7.4-1.3.9-1.3zm1.7 0c.4 0 .9.5.9 1.3 0 .4-.2.7-.5.8.1-.1.1-.2.1-.3 0-.3-.3-.5-.5-.5-.2 0-.4.1-.4.3-.1-.1-.4-.4-.4-.7 0-.5.3-.9.8-.9z"/></svg>`,
};

let currentOs: Platform | null = null;

function setSelectedOs(os: Platform) {
  currentOs = os;
  document.querySelectorAll<HTMLElement>("[data-os-label]").forEach((el) => {
    el.textContent = OS_LABEL[os];
  });
  document.querySelectorAll<HTMLElement>("[data-os-icon]").forEach((el) => {
    el.innerHTML = OS_ICON_SVG[os];
  });
}

function setBusy(el: DownloadEl, busy: boolean) {
  const split = el.closest<HTMLElement>("[data-cododoro-split-button]");
  const target = split ?? el;
  if (busy) target.setAttribute("aria-busy", "true");
  else target.removeAttribute("aria-busy");
}

function showMobileNote() {
  const note = document.getElementById("cododoro-mobile-note");
  if (note) {
    note.classList.remove("hidden");
    note.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  document.getElementById("download")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function attachDownloadTrigger(el: DownloadEl) {
  el.addEventListener("click", async (event) => {
    if (el.getAttribute("aria-busy") === "true") {
      event.preventDefault();
      return;
    }
    event.preventDefault();

    const preferredRaw = el.dataset.cododoroDownload ?? "auto";
    const preferred = preferredRaw === "auto" ? (currentOs ?? "auto") : (preferredRaw as Platform);

    await startDownload(preferred, {
      onStart: () => setBusy(el, true),
      onEnd: () => setBusy(el, false),
      onMobile: () => {
        setBusy(el, false);
        showMobileNote();
      },
    });
  });
}

function attachDropdown(toggle: HTMLButtonElement) {
  const group = toggle.closest<HTMLElement>("[data-os-group]");
  if (!group) return;
  const menu = group.querySelector<HTMLElement>("[data-os-menu]");
  if (!menu) return;

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = !menu.classList.contains("hidden");
    document
      .querySelectorAll<HTMLElement>("[data-os-menu]")
      .forEach((m) => m.classList.add("hidden"));
    document
      .querySelectorAll<HTMLButtonElement>("[data-os-toggle]")
      .forEach((t) => t.setAttribute("aria-expanded", "false"));
    if (!open) {
      menu.classList.remove("hidden");
      toggle.setAttribute("aria-expanded", "true");
    }
  });
}

function attachOptionPick(button: HTMLButtonElement) {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const os = button.dataset.osPick as Platform | undefined;
    if (!os) return;
    setSelectedOs(os);
    document
      .querySelectorAll<HTMLElement>("[data-os-menu]")
      .forEach((m) => m.classList.add("hidden"));
    document
      .querySelectorAll<HTMLButtonElement>("[data-os-toggle]")
      .forEach((t) => t.setAttribute("aria-expanded", "false"));
  });
}

function closeAllMenusOnOutsideClick() {
  document.addEventListener("click", () => {
    document
      .querySelectorAll<HTMLElement>("[data-os-menu]")
      .forEach((m) => m.classList.add("hidden"));
    document
      .querySelectorAll<HTMLButtonElement>("[data-os-toggle]")
      .forEach((t) => t.setAttribute("aria-expanded", "false"));
  });
}

function init() {
  const detected = detectPlatform();
  const initial: Platform =
    detected === "macOS" || detected === "Windows" || detected === "Linux" ? detected : "macOS";
  setSelectedOs(initial);

  document.querySelectorAll<DownloadEl>("[data-cododoro-download]").forEach(attachDownloadTrigger);
  document.querySelectorAll<HTMLButtonElement>("[data-os-toggle]").forEach(attachDropdown);
  document.querySelectorAll<HTMLButtonElement>("[data-os-pick]").forEach(attachOptionPick);

  closeAllMenusOnOutsideClick();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
