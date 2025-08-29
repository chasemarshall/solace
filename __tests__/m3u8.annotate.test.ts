import { rewriteM3U8, getAnnotationStats } from '@/lib/m3u8/annotate';

describe('M3U8 Annotator', () => {
  const mockManifest = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:2.0,
segment1.ts
#EXT-X-SCTE35:CUE-OUT=DURATION=30.0
#EXTINF:2.0,
ad-segment1.ts
#EXTINF:2.0,
ad-segment2.ts
#EXT-X-SCTE35:CUE-IN
#EXTINF:2.0,
segment2.ts`;

  describe('Annotation Mode', () => {
    beforeEach(() => {
      delete process.env.DEV_SKIP_ENABLED;
    });

    test('preserves EXTM3U header', () => {
      const result = rewriteM3U8(mockManifest);
      expect(result).toContain('#EXTM3U');
    });

    test('annotates SCTE-35 cues without removing them', () => {
      const result = rewriteM3U8(mockManifest);
      
      // Should add annotations
      expect(result).toContain('#EXT-X-COMMENT:annot=cue-detected');
      
      // Should preserve original lines in annotate mode
      expect(result).toContain('#EXT-X-SCTE35:CUE-OUT=DURATION=30.0');
      expect(result).toContain('#EXT-X-SCTE35:CUE-IN');
      
      // Should not delete any segments
      expect(result).toContain('ad-segment1.ts');
      expect(result).toContain('ad-segment2.ts');
    });

    test('detects CUE-OUT with duration', () => {
      const result = rewriteM3U8(mockManifest);
      expect(result).toContain('type=CUE_OUT,duration=30');
    });
  });

  describe('Skip Mode', () => {
    beforeEach(() => {
      process.env.DEV_SKIP_ENABLED = 'true';
    });

    afterEach(() => {
      delete process.env.DEV_SKIP_ENABLED;
    });

    test('skips expected segment count with discontinuity', () => {
      const result = rewriteM3U8(mockManifest);
      
      // Should skip ad segments
      expect(result).not.toContain('ad-segment1.ts');
      expect(result).not.toContain('ad-segment2.ts');
      
      // Should insert exactly one discontinuity
      const discontinuities = (result.match(/#EXT-X-DISCONTINUITY/g) || []).length;
      expect(discontinuities).toBe(1);
      
      // Should preserve normal segments
      expect(result).toContain('segment1.ts');
      expect(result).toContain('segment2.ts');
    });

    test('removes SCTE-35 markers in skip mode', () => {
      const result = rewriteM3U8(mockManifest);
      
      // Should remove original SCTE-35 lines
      expect(result).not.toContain('#EXT-X-SCTE35:CUE-OUT=DURATION=30.0');
      expect(result).not.toContain('#EXT-X-SCTE35:CUE-IN');
    });
  });

  describe('getAnnotationStats', () => {
    test('counts annotations correctly', () => {
      const annotated = rewriteM3U8(mockManifest);
      const stats = getAnnotationStats(annotated);
      
      expect(stats.cueCount).toBeGreaterThan(0);
      expect(stats.scte35Count).toBe(0); // No raw SCTE35 in this test
      expect(stats.cueOutCount).toBe(1);
      expect(stats.cueInCount).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty manifest', () => {
      expect(() => rewriteM3U8('')).not.toThrow();
    });

    test('preserves manifest without cues', () => {
      const simple = `#EXTM3U\n#EXTINF:2.0,\nsegment.ts`;
      const result = rewriteM3U8(simple);
      expect(result).toContain('#EXTM3U');
      expect(result).toContain('segment.ts');
      expect(result).not.toContain('annot=cue-detected');
    });
  });
});