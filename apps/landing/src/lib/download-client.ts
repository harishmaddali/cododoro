import {
  GITHUB_REPO,
  pickDownloadsFromRelease,
  releasesUrl,
  type Platform,
  type PlatformDownloads,
} from "./github-releases";

export type DetectedPlatform = Platform | "mobile" | "unknown";

const CACHE_KEY = "cododoro:latest-downloads:v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedDownloads = {
  ts: number;
  downloads: PlatformDownloads;
};

type NavigatorUAData = {
  platform?: string;
  mobile?: boolean;
};

export function detectPlatform(): DetectedPlatform {
  if (typeof navigator === "undefined") return "unknown";

  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;

  if (uaData?.mobile) return "mobile";

  const uaPlatform = uaData?.platform?.toLowerCase() ?? "";
  if (uaPlatform.includes("mac")) return "macOS";
  if (uaPlatform.includes("win")) return "Windows";
  if (uaPlatform.includes("linux") || uaPlatform.includes("chrome os")) return "Linux";
  if (uaPlatform.includes("android")) return "mobile";

  const ua = navigator.userAgent ?? "";
  if (/(iphone|ipad|ipod|android)/i.test(ua)) return "mobile";
  if (/mac/i.test(ua)) return "macOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/linux/i.test(ua)) return "Linux";

  // navigator.platform is deprecated but remains the most reliable fallback
  // for older browsers that don't expose userAgentData.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const navPlatform = (navigator.platform ?? "").toLowerCase();
  if (navPlatform.includes("mac")) return "macOS";
  if (navPlatform.includes("win")) return "Windows";
  if (navPlatform.includes("linux")) return "Linux";

  return "unknown";
}

function readCache(): PlatformDownloads | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedDownloads;
    if (Date.now() - cached.ts > CACHE_TTL_MS) return null;
    return cached.downloads;
  } catch {
    return null;
  }
}

function writeCache(downloads: PlatformDownloads) {
  try {
    const payload: CachedDownloads = { ts: Date.now(), downloads };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable (private mode, quota) — non-fatal.
  }
}

let inflight: Promise<PlatformDownloads> | null = null;

export async function loadLatestDownloads(): Promise<PlatformDownloads> {
  const cached = readCache();
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
    const release = await res.json();
    const downloads = pickDownloadsFromRelease(release);
    writeCache(downloads);
    return downloads;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

function triggerDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  // Cross-origin redirects from api.github.com will ignore the `download`
  // attribute, but it's a useful hint for the direct asset URL.
  a.setAttribute("download", "");
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export type DownloadCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onMobile?: () => void;
  onError?: (err: unknown) => void;
};

export async function startDownload(
  preferred: Platform | "auto",
  callbacks: DownloadCallbacks = {},
): Promise<void> {
  const platform: DetectedPlatform = preferred === "auto" ? detectPlatform() : preferred;

  if (platform === "mobile") {
    callbacks.onMobile?.();
    return;
  }
  if (platform === "unknown") {
    window.location.href = releasesUrl;
    return;
  }

  callbacks.onStart?.();
  try {
    const downloads = await loadLatestDownloads();
    const url = downloads[platform];
    if (!url || url === releasesUrl) {
      window.location.href = releasesUrl;
      return;
    }
    triggerDownload(url);
  } catch (err) {
    callbacks.onError?.(err);
    window.location.href = releasesUrl;
  } finally {
    callbacks.onEnd?.();
  }
}
