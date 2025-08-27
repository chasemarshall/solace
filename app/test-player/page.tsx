import type { Metadata } from "next";
import WatchPlayer from "@/components/WatchPlayer";
import ErrorBoundary from "@/components/ErrorBoundary";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Player Test",
};

export default async function TestPlayer() {
  const parent = process.env.NEXT_PUBLIC_TWITCH_PARENT || "localhost";
  const testChannel = "twitch"; // Always live channel for testing

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Player Test Page</h1>
        <p className="text-text-muted mb-4">
          This page helps test the Twitch player implementation. The channel &quot;twitch&quot; is always live.
        </p>
        
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-4">
          <h2 className="font-semibold text-blue-300 mb-2">Current Configuration:</h2>
          <div className="text-sm text-blue-200 space-y-1">
            <div><strong>Parent Domains:</strong> {parent}</div>
            <div><strong>Test Channel:</strong> {testChannel}</div>
            <div><strong>Environment:</strong> {process.env.NODE_ENV}</div>
          </div>
        </div>
      </div>

      <ErrorBoundary>
        <WatchPlayer channel={testChannel} parent={parent} />
      </ErrorBoundary>

      <div className="mt-8 bg-surface rounded-xl p-4">
        <h2 className="font-semibold mb-3">Troubleshooting Tips:</h2>
        <ul className="text-sm text-text-muted space-y-2">
          <li>• If Enhanced mode fails, try Basic mode using the toggle buttons</li>
          <li>• Check browser console for any error messages</li>
          <li>• Ensure your domain is in the NEXT_PUBLIC_TWITCH_PARENT environment variable</li>
          <li>• Enhanced mode starts muted - use the &quot;Unmute Stream&quot; button</li>
          <li>• If you see CORS errors, Basic mode will work without restrictions</li>
        </ul>
      </div>
    </div>
  );
}
