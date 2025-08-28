import { Metadata } from 'next';
import { validateDevEnvironment } from '@/lib/dev/config';
import { DevWatchPlayer } from '@/components/DevWatchPlayer';
import { DevAnalytics } from '@/components/DevAnalytics';
import TwitchChat from '@/components/TwitchChat';
import StreamInfo from '@/components/StreamInfo';
import ErrorBoundary from '@/components/ErrorBoundary';
import { notFound } from 'next/navigation';

interface DevWatchProps {
  params: { channel: string };
  searchParams: { debug?: string };
}

export async function generateMetadata({ params }: DevWatchProps): Promise<Metadata> {
  return { 
    title: `[DEV] ${params.channel} • solace.`,
    description: `Development mode stream viewer for ${params.channel} with advanced ad blocking research tools`
  };
}

export default function DevWatch({ params, searchParams }: DevWatchProps) {
  // Validate dev environment server-side
  const { valid, errors } = validateDevEnvironment();
  if (!valid) {
    console.error('Dev mode validation failed:', errors);
    notFound();
  }

  const isDebugMode = searchParams.debug === 'true';
  const parent = process.env.NEXT_PUBLIC_TWITCH_PARENT || 'localhost';

  return (
    <div className="dev-mode min-h-screen">
      {/* Development Mode Warning Banner */}
      <div className="bg-gradient-to-r from-yellow-500/20 via-red-500/20 to-yellow-500/20 border border-yellow-500/50 p-4 mb-6 rounded-lg backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <div className="text-yellow-300 font-bold text-sm">
                DEVELOPMENT MODE ACTIVE
              </div>
              <div className="text-yellow-200/80 text-xs mt-1">
                Enhanced ad blocking research environment • Educational use only
              </div>
            </div>
          </div>
          <div className="text-xs text-yellow-200/60 font-mono">
            Channel: {params.channel}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-4 lg:grid-cols-3">
        {/* Main Content */}
        <div className="xl:col-span-3 lg:col-span-2 space-y-6">
          {/* Enhanced Player */}
          <ErrorBoundary>
            <DevWatchPlayer 
              channel={params.channel}
              parent={parent}
            />
          </ErrorBoundary>
          
          {/* Analytics Dashboard */}
          <ErrorBoundary>
            <DevAnalytics channel={params.channel} />
          </ErrorBoundary>

          {/* Stream Information (Development Details) */}
          <ErrorBoundary>
            <div className="bg-surface/50 rounded-xl p-4 border border-white/5">
              <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
                📊 Stream Details
                {isDebugMode && <span className="text-xs bg-purple-500 px-2 py-1 rounded">DEBUG</span>}
              </h3>
              <StreamInfo channel={params.channel} />
              
              {isDebugMode && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-sm font-medium text-text mb-2">Debug Information</h4>
                  <div className="text-xs text-text-muted font-mono space-y-1">
                    <div>Environment: {process.env.NODE_ENV}</div>
                    <div>Parent Domain: {parent}</div>
                    <div>Route: /dev/watch/{params.channel}</div>
                    <div>Timestamp: {new Date().toISOString()}</div>
                  </div>
                </div>
              )}
            </div>
          </ErrorBoundary>
        </div>
        
        {/* Sidebar */}
        <aside className="xl:col-span-1 lg:col-span-1">
          <div className="rounded-xl border border-white/5 bg-surface/50 h-[75vh]">
            <ErrorBoundary>
              <TwitchChat channel={params.channel} playerMode="enhanced" />
            </ErrorBoundary>
          </div>
        </aside>
      </div>

      {/* Development Footer */}
      <footer className="mt-8 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-4">
            <span>🛡️ Dev Mode Active</span>
            <span>📊 Analytics Enabled</span>
            <span>🔬 Research Environment</span>
          </div>
          <div className="font-mono">
            Built for educational and research purposes only
          </div>
        </div>
      </footer>
    </div>
  );
}