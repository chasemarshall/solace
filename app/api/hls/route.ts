import { NextRequest, NextResponse } from 'next/server';
import { rewriteM3U8 } from '@/lib/video/m3u8';

export async function GET(request: NextRequest) {

  const { searchParams } = new URL(request.url);
  const src = searchParams.get('src');

  if (!src) {
    return new NextResponse('Missing src parameter', { status: 400 });
  }

  // Only allow HTTPS URLs
  if (!src.startsWith('https://')) {
    return new NextResponse('Only HTTPS URLs allowed', { status: 400 });
  }

  try {
    // Fetch upstream HLS manifest
    const response = await fetch(src, {
      headers: {
        'Accept': 'application/vnd.apple.mpegurl',
        'User-Agent': 'Mozilla/5.0 (compatible; HLS-Dev-Sandbox)',
      },
    });

    if (!response.ok) {
      console.error('HLS fetch failed:', response.status, response.statusText);
      return new NextResponse('Upstream error', { status: 502 });
    }

    const originalText = await response.text();

    // Process through our annotator
    const annotatedText = rewriteM3U8(originalText, src);

    return new NextResponse(annotatedText, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('HLS processing error:', error);
    return new NextResponse('Processing error', { status: 502 });
  }
}