"use client";

import { useFollows } from '@/hooks/useFollows';

interface FollowButtonProps {
  channel: string;
  displayName?: string;
  className?: string;
}

export default function FollowButton({ channel, displayName, className = "" }: FollowButtonProps) {
  const { isFollowing, followChannel, unfollowChannel } = useFollows();
  const following = isFollowing(channel);

  const handleToggle = () => {
    if (following) {
      unfollowChannel(channel);
    } else {
      followChannel(channel, displayName);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
        following
          ? 'bg-gray-600 hover:bg-gray-700 text-white'
          : 'bg-purple-600 hover:bg-purple-700 text-white'
      } ${className}`}
      title={following ? `Unfollow ${displayName || channel}` : `Follow ${displayName || channel}`}
    >
      {following ? (
        <>
          <svg className="inline w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Following
        </>
      ) : (
        <>
          <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Follow
        </>
      )}
    </button>
  );
}