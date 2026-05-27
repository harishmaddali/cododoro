export const GITHUB_REPO = "harishmaddali/cododoro";

export const repoUrl = `https://github.com/${GITHUB_REPO}`;

export const releasesUrl = `${repoUrl}/releases/latest`;

export type Platform = "macOS" | "Windows" | "Linux";

export type PlatformDownloads = Record<Platform, string> & {
  version: string | null;
};

type GitHubAsset = {
  name: string;
  browser_download_url: string;
};

type GitHubRelease = {
  tag_name: string;
  assets: GitHubAsset[];
};

function pickAsset(assets: GitHubAsset[], ext: RegExp, prefer?: RegExp): GitHubAsset | undefined {
  const matches = assets.filter((asset) => ext.test(asset.name));
  if (matches.length === 0) return undefined;
  if (prefer) {
    return matches.find((asset) => prefer.test(asset.name)) ?? matches[0];
  }
  return matches[0];
}

export function pickDownloadsFromRelease(release: GitHubRelease): PlatformDownloads {
  const { assets } = release;
  const version = release.tag_name.replace(/^v/i, "");

  const mac = pickAsset(assets, /\.dmg$/i, /universal/i);
  const windows = pickAsset(assets, /\.msi$/i);
  const linux = pickAsset(assets, /\.appimage$/i);

  return {
    version,
    macOS: mac?.browser_download_url ?? releasesUrl,
    Windows: windows?.browser_download_url ?? releasesUrl,
    Linux: linux?.browser_download_url ?? releasesUrl,
  };
}

export async function getLatestDownloads(): Promise<PlatformDownloads> {
  const fallback: PlatformDownloads = {
    version: null,
    macOS: releasesUrl,
    Windows: releasesUrl,
    Linux: releasesUrl,
  };

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "cododoro-landing",
      },
    });

    if (!res.ok) return fallback;

    const release = (await res.json()) as GitHubRelease;
    if (!release.assets?.length)
      return { ...fallback, version: release.tag_name.replace(/^v/i, "") };

    return pickDownloadsFromRelease(release);
  } catch {
    return fallback;
  }
}
