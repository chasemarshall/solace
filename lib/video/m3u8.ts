/**
 * M3U8 SSAI Cue Annotator
 * 
 * Default mode: Annotates SSAI cues with comments for analysis
 * Optional skip mode: Performs guarded segment skipping while preserving continuity
 */

interface CueInfo {
  type: 'SCTE35' | 'DATERANGE' | 'CUE_OUT' | 'CUE_IN';
  duration?: number;
  data?: string;
}

export function rewriteM3U8(manifest: string, baseUrl: string): string {
  const skipMode = process.env.DEV_SKIP_ENABLED === 'true';
  const lines = manifest.split('\n');
  const result: string[] = [];

  let skipSegments = 0;
  let segmentDuration = 2; // Default 2s target duration
  let inAdBreak = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Always preserve M3U8 header
    if (line.startsWith('#EXTM3U')) {
      result.push(line);
      continue;
    }

    // Extract target duration for better skip calculations
    if (line.startsWith('#EXT-X-TARGETDURATION:')) {
      const match = line.match(/#EXT-X-TARGETDURATION:(\d+)/);
      if (match) {
        segmentDuration = parseInt(match[1], 10);
      }
      result.push(line);
      continue;
    }

    // Detect and process SSAI cues
    const cue = detectCue(line);
    if (cue) {
      // Always annotate the cue
      result.push(`#EXT-X-COMMENT:annot=cue-detected,type=${cue.type}${cue.duration ? `,duration=${cue.duration}` : ''}`);

      if (skipMode && cue.type === 'CUE_OUT' && cue.duration) {
        // Calculate segments to skip based on duration
        skipSegments = Math.ceil(cue.duration / segmentDuration);
        inAdBreak = true;
        result.push(`#EXT-X-COMMENT:skip-start,segments=${skipSegments}`);
        // Skip the original cue line in skip mode
        continue;
      } else if (skipMode && cue.type === 'CUE_IN') {
        inAdBreak = false;
        result.push(`#EXT-X-COMMENT:skip-end`);
        // Skip the original cue line in skip mode
        continue;
      }
    }

    // Handle segment skipping in skip mode
    if (skipMode && skipSegments > 0) {
      // Skip EXTINF and segment URL pairs
      if (line.startsWith('#EXTINF:')) {
        // Skip this EXTINF and the next segment URL
        skipSegments--;
        i++; // Skip next line (segment URL)

        // Insert discontinuity marker when skipping ends
        if (skipSegments === 0) {
          result.push('#EXT-X-DISCONTINUITY');
          result.push('#EXT-X-COMMENT:skip-discontinuity-inserted');
        }
        continue;
      }
    }

    // Handle CUE_IN reset
    if (cue?.type === 'CUE_IN') {
      skipSegments = 0;
      inAdBreak = false;
    }

    // URL Rewriting Logic
    if (line && !line.startsWith('#')) {
      try {
        // Resolve relative URLs against the base URL
        const absoluteUrl = new URL(line, baseUrl).toString();
        // Rewrite to go through our proxy
        const proxiedUrl = `/api/hls?src=${encodeURIComponent(absoluteUrl)}`;
        result.push(proxiedUrl);
      } catch (e) {
        // If URL parsing fails, keep original line (unlikely for valid M3U8)
        result.push(line);
      }
    } else {
      // Pass through all other lines (tags, comments)
      result.push(line);
    }
  }

  return result.join('\n');
}

function detectCue(line: string): CueInfo | null {
  // SCTE-35 markers
  if (line.includes('#EXT-X-SCTE35')) {
    return {
      type: 'SCTE35',
      data: line.substring(line.indexOf(':') + 1)
    };
  }

  // DATERANGE with SCTE-35 data
  if (line.startsWith('#EXT-X-DATERANGE') && line.includes('SCTE35')) {
    return {
      type: 'DATERANGE',
      data: line.substring(line.indexOf(':') + 1)
    };
  }

  // CUE-OUT with optional duration
  if (line.includes('#EXT-X-CUE-OUT')) {
    const durationMatch = line.match(/DURATION=([0-9.]+)/);
    return {
      type: 'CUE_OUT',
      duration: durationMatch ? parseFloat(durationMatch[1]) : undefined
    };
  }

  // CUE-IN
  if (line.includes('#EXT-X-CUE-IN')) {
    return {
      type: 'CUE_IN'
    };
  }

  return null;
}

export function getAnnotationStats(manifest: string) {
  const lines = manifest.split('\n');
  const stats = {
    cueCount: 0,
    scte35Count: 0,
    cueOutCount: 0,
    cueInCount: 0,
    dateRangeCount: 0,
    lastCueTime: null as Date | null,
    discontinuities: 0
  };

  for (const line of lines) {
    if (line.includes('annot=cue-detected')) {
      stats.cueCount++;
      stats.lastCueTime = new Date();

      if (line.includes('type=SCTE35')) stats.scte35Count++;
      if (line.includes('type=CUE_OUT')) stats.cueOutCount++;
      if (line.includes('type=CUE_IN')) stats.cueInCount++;
      if (line.includes('type=DATERANGE')) stats.dateRangeCount++;
    }

    if (line.startsWith('#EXT-X-DISCONTINUITY')) {
      stats.discontinuities++;
    }
  }

  return stats;
}