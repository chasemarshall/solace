"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserProfile } from "./UserProfile";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/watch/${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="border-b border-white/5 bg-surface/60 backdrop-blur mb-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight text-xl">
          solace.
        </Link>
        <form onSubmit={handleSearch} className="hidden sm:block">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="go to channel…"
            className="w-72 rounded-xl bg-bg px-3 py-2 text-sm outline-none ring-purple-500/30 focus:ring-2 border border-white/10"
          />
        </form>
        <UserProfile />
      </div>
    </header>
  );
}
