export class M3U8AdFilter {
  private static readonly AD_MARKERS = [
    '#EXT-X-SCTE35',
    '#EXT-X-DATERANGE',
    '#EXT-X-CUE-OUT',
    '#EXT-X-CUE-IN',
    '#EXT-X-DISCONTINUITY'
  ];

  private static readonly AD_SEGMENT_PATTERNS = [
    'ad-',
    'commercial',
    'stitched-ad',
    'preroll',
    'midroll',
    'postroll',
    '/ads/',
    'amazon-adsystem',
    'doubleclick'
  ];

  /**
   * Enhanced M3U8 playlist filtering for SSAI ad removal
   */
  static filterPlaylist(m3u8Content: string): string {
    const lines = m3u8Content.split('\n');
    const filtered: string[] = [];
    let skipNextSegments = false;
    let adSegmentCount = 0;
    let segmentsToSkip = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect SCTE-35 ad markers
      if (this.AD_MARKERS.some(marker => line.startsWith(marker))) {
        console.log('🚫 M3U8: Removed SCTE-35 marker:', line.substring(0, 60));
        
        if (line.includes('DURATION=')) {
          const duration = parseFloat(line.match(/DURATION=([0-9.]+)/)?.[1] || '30');
          segmentsToSkip = Math.ceil(duration / 2); // 2s segments
        } else {
          segmentsToSkip = 15; // Default skip
        }
        
        skipNextSegments = true;
        continue;
      }
      
      // Skip ad segments
      if (skipNextSegments && (line.startsWith('http') || line.endsWith('.ts'))) {
        const isAdSegment = this.AD_SEGMENT_PATTERNS.some(pattern => 
          line.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (isAdSegment || segmentsToSkip > 0) {
          console.log('🚫 M3U8: Removed ad segment:', line.substring(0, 80));
          adSegmentCount++;
          
          if (segmentsToSkip > 0) {
            segmentsToSkip--;
            if (segmentsToSkip === 0) {
              skipNextSegments = false;
            }
          }
          continue;
        }
        
        skipNextSegments = false;
      }
      
      // Skip ad-related EXTINF lines
      if (line.startsWith('#EXTINF') && skipNextSegments) {
        continue;
      }
      
      filtered.push(line);
    }
    
    if (adSegmentCount > 0) {
      console.log(`✅ M3U8: Filtered playlist - removed ${adSegmentCount} ad segments`);
    }
    
    return filtered.join('\n');
  }
}