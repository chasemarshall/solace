import { Metadata } from 'next';
import DevWatchPlayer from '@/components/dev/DevWatchPlayer';
import { notFound } from 'next/navigation';

interface DevWatchProps {
  params: { channel: string };
  searchParams: { src?: string };
}

export async function generateMetadata({ params }: DevWatchProps): Promise<Metadata> {
  return { 
    title: `[DEV] ${params.channel} • solace.`,
    description: `Educational HLS SSAI sandbox for ${params.channel}`
  };
}

export default function DevWatch({ params, searchParams }: DevWatchProps) {
  // Production guard
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  // Get HLS source from query param or env fallback
  const hlsSrc = searchParams.src || process.env.NEXT_PUBLIC_DEV_HLS_SRC;
  
  if (!hlsSrc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">⚠ Configuration Error</div>
          <div className="text-gray-600">No HLS source provided. Use ?src= parameter or set NEXT_PUBLIC_DEV_HLS_SRC</div>
        </div>
      </div>
    );
  }

  return (
    <DevWatchContent channel={params.channel} hlsSrc={hlsSrc} />
  );
}

function DevWatchContent({ channel, hlsSrc }: { channel: string; hlsSrc: string }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Educational dev banner */}
      <div className="bg-gradient-to-r from-orange-500/20 via-yellow-500/20 to-orange-500/20 border border-orange-500/50 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔬</div>
            <div>
              <div className="text-orange-300 font-bold text-sm">
                EDUCATIONAL DEV SANDBOX
              </div>
              <div className="text-orange-200/80 text-xs mt-1">
                HLS SSAI cue analysis • Development only
              </div>
            </div>
          </div>
          <div className="text-xs text-orange-200/60 font-mono">
            Channel: {channel}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Main player */}
          <div className="lg:col-span-3 space-y-4">
            <HlsPlayerWithAnalytics hlsSrc={hlsSrc} />
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-surface/50 rounded-lg p-4 border border-white/5">
              <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                📊 Stream Info
              </h3>
              <div className="text-xs text-text-muted space-y-2">
                <div><span className="text-text">Channel:</span> {channel}</div>
                <div><span className="text-text">Source:</span> <span className="font-mono break-all">{hlsSrc.substring(0, 40)}...</span></div>
                <div><span className="text-text">Mode:</span> {process.env.DEV_SKIP_ENABLED === 'true' ? 'Skip' : 'Annotate'}</div>
                <div><span className="text-text">Environment:</span> Development</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HlsPlayerWithAnalytics({ hlsSrc }: { hlsSrc: string }) {
  return (
    <div className="space-y-4">
      <DevWatchPlayer channel="dev" />
      
      <HlsAnalyticsSummary hlsSrc={hlsSrc} />
    </div>
  );
}

function HlsAnalyticsSummary({ hlsSrc }: { hlsSrc: string }) {
  return (
    <div className="bg-surface/30 rounded-lg p-4 border border-white/5">
      <h4 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
        🔍 SSAI Cue Analytics
      </h4>
      <div className="grid grid-cols-3 gap-4 text-xs">
        <div className="text-center">
          <div className="text-lg font-mono text-blue-400" id="cue-count">-</div>
          <div className="text-text-muted">Cues Detected</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-mono text-green-400" id="discontinuities">-</div>
          <div className="text-text-muted">Discontinuities</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-mono text-purple-400" id="last-cue">-</div>
          <div className="text-text-muted">Last Cue</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-text-muted">
        <div className="flex justify-between">
          <span>Source:</span>
          <span className="font-mono">{hlsSrc.split('/').pop()?.substring(0, 20)}...</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Mode:</span>
          <span>{process.env.DEV_SKIP_ENABLED === 'true' ? '🎯 Skip Mode' : '📝 Annotate Mode'}</span>
        </div>
      </div>
    </div>
  );
}