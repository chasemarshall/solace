/**
 * Pure M3U8 playlist utilities — no browser dependencies.
 * Safe to import from server-side routes.
 *
 * Twitch injects mid-roll and pre-roll ads into the HLS playlist using
 * EXT-X-DATERANGE tags with CLASS="twitch-stitched-ad" (or similar).
 * The ad content lives inside DISCONTINUITY blocks in the media playlist.
 */

const AD_DATERANGE_PATTERN = /^#EXT-X-DATERANGE:.*(?:CLASS="twitch-stitched-ad"|ID="stitched-ad|CLASS="twitch-ad"|stitched-ad|X-TV-TWITCH-AD-[A-Z0-9-]+|MIDROLL|PREROLL|COMMERCIAL|SCTE35-OUT|X-TV-TWITCH-LIVE-SEQUENCE|X-TV-TWITCH-ELAPSED-SECS)/i;
const AD_SCTE35_PATTERN = /^#EXT-X-(?:SCTE35|SPLICEPOINT-SCTE35|OATCLS-SCTE35)/i;
const AD_SCTE35_OUT_PATTERN = /^#EXT-X-SCTE35-OUT/i;
const AD_SCTE35_IN_PATTERN = /^#EXT-X-SCTE35-IN/i;
const AD_CUE_OUT_PATTERN = /^#EXT-X-CUE-OUT/i;
const AD_CUE_OUT_CONT_PATTERN = /^#EXT-X-CUE-OUT-CONT/i;
const AD_CUE_IN_PATTERN = /^#EXT-X-CUE-IN/i;
const DISCONTINUITY_PATTERN = /^#EXT-X-DISCONTINUITY$/;
const PREFETCH_PATTERN = /^#EXT-X-TWITCH-PREFETCH:/;
const EXTINF_PATTERN = /^#EXTINF:([0-9.]+)/;
const DATERANGE_DURATION_PATTERN = /(?:DURATION|PLANNED-DURATION)=([0-9.]+)/i;
const CUE_OUT_DURATION_PATTERN = /(?:Duration|DURATION)=([0-9.]+)/;
const CUE_OUT_ELAPSED_PATTERN = /(?:ElapsedTime|ELAPSED)=([0-9.]+)/;
const CUE_OUT_INLINE_DURATION_PATTERN = /^#EXT-X-CUE-OUT:([0-9.]+)/i;
const LIVE_EXTINF_PATTERN = /^#EXTINF:[0-9.]+,live\b/i;
const AD_SEGMENT_HINT_PATTERN = /(?:^|[,/_.?&=-])(?:ad|ads|advert|advertisement|commercial|stitched-ad|stitched_ad|preroll|pre-roll|midroll|mid-roll)(?:$|[,/_.?&=-])/i;
const AD_RESOURCE_HOSTS = [
  'ads.twitch.tv',
  'twitchads.com',
  'pubads.g.doubleclick.net',
  'googleads.g.doubleclick.net',
  'googlesyndication.com',
  'amazon-adsystem.com',
];
const AD_TRACKING_URL_PATTERNS = [
  /(X-TV-TWITCH-AD-URL=")(?:[^"]*)(")/g,
  /(X-TV-TWITCH-AD-CLICK-TRACKING-URL=")(?:[^"]*)(")/g,
] as const;

function sanitizeAdMetadata(line: string): string {
  let sanitized = line;
  for (const pattern of AD_TRACKING_URL_PATTERNS) {
    sanitized = sanitized.replace(pattern, '$1https://twitch.tv$2');
  }
  return sanitized;
}

function isAdStartMarker(line: string): boolean {
  return AD_DATERANGE_PATTERN.test(line) ||
    AD_SCTE35_OUT_PATTERN.test(line) ||
    AD_CUE_OUT_PATTERN.test(line) ||
    AD_CUE_OUT_CONT_PATTERN.test(line) ||
    (AD_SCTE35_PATTERN.test(line) && !AD_SCTE35_IN_PATTERN.test(line));
}

function isAdEndMarker(line: string): boolean {
  return AD_SCTE35_IN_PATTERN.test(line) || AD_CUE_IN_PATTERN.test(line);
}

function isMediaResourceLine(line: string): boolean {
  return !line.startsWith('#') && line.trim().length > 0;
}

function getAdDurationTarget(line: string): number {
  const daterangeDuration = line.match(DATERANGE_DURATION_PATTERN);
  if (daterangeDuration) {
    return parseFloat(daterangeDuration[1]);
  }

  const cueDuration = line.match(CUE_OUT_DURATION_PATTERN) || line.match(CUE_OUT_INLINE_DURATION_PATTERN);
  if (!cueDuration) {
    return 0;
  }

  const duration = parseFloat(cueDuration[1]);
  const elapsed = parseFloat(line.match(CUE_OUT_ELAPSED_PATTERN)?.[1] || '0');
  return Math.max(duration - elapsed, 0);
}

export function isLikelyAdResourceUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return false;
  }

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();
    if (AD_RESOURCE_HOSTS.some(host => hostname === host || hostname.endsWith(`.${host}`))) {
      return true;
    }
    return AD_SEGMENT_HINT_PATTERN.test(`${url.pathname}${url.search}`);
  } catch {
    return AD_SEGMENT_HINT_PATTERN.test(trimmed);
  }
}

function stripResidualAdSegments(lines: string[]): string[] {
  const output: string[] = [];
  let pendingExtinf: string | null = null;

  for (const rawLine of lines) {
    const line = sanitizeAdMetadata(rawLine);

    if (PREFETCH_PATTERN.test(line)) {
      continue;
    }

    if (AD_DATERANGE_PATTERN.test(line)) {
      continue;
    }

    if (isAdStartMarker(line) || isAdEndMarker(line)) {
      continue;
    }

    if (EXTINF_PATTERN.test(line)) {
      pendingExtinf = line;
      continue;
    }

    if (isMediaResourceLine(line)) {
      if (pendingExtinf) {
        if (!AD_SEGMENT_HINT_PATTERN.test(pendingExtinf) && !isLikelyAdResourceUrl(line)) {
          output.push(pendingExtinf);
          output.push(line);
        }
        pendingExtinf = null;
      } else {
        output.push(line);
      }
      continue;
    }

    if (pendingExtinf) {
      output.push(pendingExtinf);
      pendingExtinf = null;
    }

    output.push(line);
  }

  if (pendingExtinf) {
    output.push(pendingExtinf);
  }

  return output;
}

/**
 * Strip ad segments from a Twitch HLS media playlist.
 * Returns the cleaned playlist text.
 *
 * Strategy: when an ad-marker tag is seen (DATERANGE stitched-ad, SCTE35-OUT,
 * CUE-OUT, CUE-OUT-CONT), enter ad mode. Exit on any of:
 *   - explicit close tag (SCTE35-IN, CUE-IN)
 *   - accumulated EXTINF durations meeting/exceeding a DATERANGE DURATION=
 *   - a second DISCONTINUITY after entering ad mode (bounds the ad region)
 */
export function stripAdSegments(playlistText: string): string {
  const normalizedText = playlistText.replace(/\r/g, '');
  const lines = normalizedText.split('\n');
  const output: string[] = [];
  let sawAdMarkers = false;

  let inAd = false;
  let adDurationTarget = 0;
  let adDurationElapsed = 0;
  let discontinuitiesSeen = 0;
  let droppedAdSegments = 0;
  let pendingAdSegmentDuration = 0;

  const exitAd = () => {
    inAd = false;
    adDurationTarget = 0;
    adDurationElapsed = 0;
    discontinuitiesSeen = 0;
    droppedAdSegments = 0;
    pendingAdSegmentDuration = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = sanitizeAdMetadata(lines[i]);

    if (isAdStartMarker(line)) {
      sawAdMarkers = true;
      inAd = true;
      adDurationTarget = getAdDurationTarget(line);
      adDurationElapsed = 0;
      discontinuitiesSeen = 0;
      droppedAdSegments = 0;
      pendingAdSegmentDuration = 0;
      continue;
    }

    if (isAdEndMarker(line)) {
      exitAd();
      continue;
    }

    if (!inAd && isMediaResourceLine(line) && isLikelyAdResourceUrl(line)) {
      sawAdMarkers = true;
      continue;
    }

    if (inAd) {
      if (PREFETCH_PATTERN.test(line)) continue;
      if (line.startsWith('#EXT-X-DATERANGE:') || line.startsWith('#EXT-X-CUE-')) continue;

      if (DISCONTINUITY_PATTERN.test(line)) {
        discontinuitiesSeen++;
        if (discontinuitiesSeen >= 2 || droppedAdSegments > 0) {
          exitAd();
          output.push(line);
        }
        continue;
      }

      const extinf = line.match(EXTINF_PATTERN);
      if (extinf) {
        if (LIVE_EXTINF_PATTERN.test(line) && !adDurationTarget) {
          exitAd();
          output.push(line);
          continue;
        }
        pendingAdSegmentDuration = parseFloat(extinf[1]);
        continue;
      }

      // Segment URL line: drop
      if (isMediaResourceLine(line)) {
        droppedAdSegments++;
        adDurationElapsed += pendingAdSegmentDuration;
        pendingAdSegmentDuration = 0;

        if (adDurationTarget && adDurationElapsed >= adDurationTarget) {
          exitAd();
        }
        continue;
      }

      // Any other tag while in ad: drop
      continue;
    }

    if (PREFETCH_PATTERN.test(line)) {
      continue;
    }

    output.push(line);
  }

  return (sawAdMarkers ? stripResidualAdSegments(output) : output).join('\n');
}

/**
 * Check if a playlist contains ad segments.
 */
export function hasAdSegments(playlistText: string): boolean {
  // Line-anchored patterns are single-line; scan each line of the playlist.
  const lines = playlistText.split('\n');
  for (const line of lines) {
    if (
      isAdStartMarker(line) ||
      isLikelyAdResourceUrl(line)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Wrap a URL through the proxy endpoint to bypass CORS.
 * The custom player must use the app-local route so HLS manifests and
 * resources pass through the same ad-filtering pipeline end to end.
 */
export function proxyUrl(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Rewrite URLs inside an M3U8 playlist so sub-requests go through the proxy.
 *
 * Twitch variant/segment URIs can be absolute (https://...) or relative
 * (e.g. `1.ts`). Relative URIs would resolve against /api/proxy in the
 * browser (broken), so we resolve them against `baseUrl` — the URL of the
 * manifest itself — before wrapping. If baseUrl is omitted, only absolute
 * URLs are rewritten (legacy behavior; relative lines are left untouched).
 */
export function rewritePlaylistUrls(
  playlistText: string,
  baseUrl?: string,
  wrap: (url: string) => string = proxyUrl,
): string {
  const lines = playlistText.split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Tags and blanks pass through
    if (!trimmed || trimmed.startsWith('#')) {
      out.push(line);
      continue;
    }

    // Absolute URL — always wrap
    if (/^https?:\/\//i.test(trimmed)) {
      out.push(wrap(trimmed));
      continue;
    }

    // Relative URI — resolve against baseUrl if provided
    if (baseUrl) {
      try {
        const resolved = new URL(trimmed, baseUrl).toString();
        out.push(wrap(resolved));
        continue;
      } catch {
        // Fall through and leave the line untouched
      }
    }

    out.push(line);
  }

  return out.join('\n');
}

export function processHlsPlaylist(
  playlistText: string,
  baseUrl?: string,
  wrap: (url: string) => string = proxyUrl,
): string {
  return rewritePlaylistUrls(stripAdSegments(playlistText), baseUrl, wrap);
}

export function processHlsPlaylistForDirectPlayback(
  playlistText: string,
  baseUrl?: string,
): string {
  return rewritePlaylistUrls(stripAdSegments(playlistText), baseUrl, url => url);
}
