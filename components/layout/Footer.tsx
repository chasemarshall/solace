"use client";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-surface/60 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center justify-center">
          <a
            href="https://ko-fi.com/chasemarsh"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 text-text-muted hover:text-accent transition-colors"
            aria-label="Buy me a coffee on Ko-fi"
          >
            <span className="text-2xl" aria-hidden="true">☕</span>
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap">
              buy me a coffee
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
