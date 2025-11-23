"use client";

import { useState, useEffect, useCallback } from 'react';

interface FollowedChannel {
  channel: string;
  displayName: string;
  followedAt: Date;
  lastLive?: Date;
}

const FOLLOWS_KEY = 'solace_follows';

// Helper to get localStorage follows (for migration/fallback)
const getFollowsFromStorage = (): FollowedChannel[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FOLLOWS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((f: any) => ({
        ...f,
        followedAt: new Date(f.followedAt),
        lastLive: f.lastLive ? new Date(f.lastLive) : undefined
      }));
    }
  } catch (error) {
    console.error('Error loading follows from localStorage:', error);
  }
  return [];
};

// Helper to migrate localStorage follows to database
const migrateFollowsToDatabase = async (localFollows: FollowedChannel[]) => {
  if (localFollows.length === 0) return;

  try {
    // Add all local follows to database
    await Promise.all(
      localFollows.map(follow =>
        fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: follow.channel,
            displayName: follow.displayName,
          }),
        })
      )
    );

    // Clear localStorage after successful migration
    localStorage.removeItem(FOLLOWS_KEY);
  } catch (error) {
    console.error('Failed to migrate follows:', error);
  }
};

export function useFollows() {
  const [follows, setFollows] = useState<FollowedChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load follows from database on mount
  useEffect(() => {
    const loadFollows = async () => {
      try {
        // First, check for localStorage follows to migrate
        const localFollows = getFollowsFromStorage();
        if (localFollows.length > 0) {
          await migrateFollowsToDatabase(localFollows);
        }

        // Fetch from database
        const response = await fetch('/api/follows');
        if (response.ok) {
          const data = await response.json();
          const followsData = data.follows.map((f: any) => ({
            ...f,
            followedAt: new Date(f.followedAt),
            lastLive: f.lastLive ? new Date(f.lastLive) : undefined,
          }));
          setFollows(followsData);
        }
      } catch (error) {
        console.error('Error loading follows:', error);
        // Fallback to localStorage if API fails
        setFollows(getFollowsFromStorage());
      } finally {
        setIsLoading(false);
      }
    };

    loadFollows();
  }, []);

  // Follow a channel
  const followChannel = useCallback(async (channel: string, displayName?: string) => {
    const newFollow: FollowedChannel = {
      channel: channel.toLowerCase(),
      displayName: displayName || channel,
      followedAt: new Date()
    };

    // Optimistic update
    setFollows(prev => {
      // Check if already following
      if (prev.some(f => f.channel === newFollow.channel)) {
        return prev;
      }

      return [...prev, newFollow].sort((a, b) =>
        b.followedAt.getTime() - a.followedAt.getTime()
      );
    });

    try {
      const response = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: newFollow.channel,
          displayName: newFollow.displayName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to follow channel');
      }
    } catch (error) {
      console.error('Error following channel:', error);
      // Revert optimistic update on error
      setFollows(prev => prev.filter(f => f.channel !== newFollow.channel));
    }
  }, []);

  // Unfollow a channel
  const unfollowChannel = useCallback(async (channel: string) => {
    const normalizedChannel = channel.toLowerCase();

    // Optimistic update
    const previousFollows = follows;
    setFollows(prev => prev.filter(f => f.channel !== normalizedChannel));

    try {
      const response = await fetch('/api/follows', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: normalizedChannel }),
      });

      if (!response.ok) {
        throw new Error('Failed to unfollow channel');
      }
    } catch (error) {
      console.error('Error unfollowing channel:', error);
      // Revert optimistic update on error
      setFollows(previousFollows);
    }
  }, [follows]);

  // Check if following a channel
  const isFollowing = useCallback((channel: string) => {
    return follows.some(f => f.channel === channel.toLowerCase());
  }, [follows]);

  // Get follow count
  const followCount = follows.length;

  // Update last live time for a channel
  const updateLastLive = useCallback(async (channel: string) => {
    const normalizedChannel = channel.toLowerCase();

    // Optimistic update
    setFollows(prev =>
      prev.map(f =>
        f.channel === normalizedChannel
          ? { ...f, lastLive: new Date() }
          : f
      )
    );

    try {
      const response = await fetch('/api/follows', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: normalizedChannel }),
      });

      if (!response.ok) {
        throw new Error('Failed to update last live');
      }
    } catch (error) {
      console.error('Error updating last live:', error);
    }
  }, []);

  return {
    follows,
    isLoading,
    followChannel,
    unfollowChannel,
    isFollowing,
    followCount,
    updateLastLive
  };
}