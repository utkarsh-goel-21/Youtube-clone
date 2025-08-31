'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Video } from '../../types/video';
import { formatDuration, formatViewCount } from '../../utils/formatters';
import { CheckCircle } from 'lucide-react';
import LazyImage from '../ui/LazyImage';

interface VideoCardProps {
  video: Video;
  showChannel?: boolean;
}

export default function VideoCard({ video, showChannel = true }: VideoCardProps) {
  const uploadedAt = new Date(video.uploadedAt);
  const timeAgo = formatDistanceToNow(uploadedAt, { addSuffix: true });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden hover:shadow-md dark:hover:shadow-gray-700 transition-shadow duration-200 w-full">
      {/* Thumbnail */}
      <Link href={`/watch/${video._id}`} className="block relative aspect-video overflow-hidden bg-gray-200 dark:bg-gray-700">
        <LazyImage
          src={video.thumbnailUrl || '/images/default-thumbnail.jpg'}
          alt={video.title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
          effect="blur"
          threshold={200}
        />
        
        {/* Duration overlay */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded">
          {formatDuration(video.duration)}
        </div>
      </Link>

      {/* Video info */}
      <div className="p-3">
        <div className="flex gap-3">
          {/* Channel avatar */}
          {showChannel && (
            <Link 
              href={`/channel/${video.author.id}`}
              className="flex-shrink-0"
            >
              {video.author.avatar ? (
                <LazyImage
                  src={video.author.avatar}
                  alt={video.author.channelName}
                  width={36}
                  height={36}
                  className="rounded-full hover:scale-105 transition-transform"
                  effect="opacity"
                  threshold={50}
                />
              ) : (
                <div className="w-9 h-9 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                    {video.author.channelName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </Link>
          )}

          {/* Video details */}
          <div className="flex-1 min-w-0">
            {/* Video title */}
            <Link
              href={`/watch/${video._id}`}
              className="block"
            >
              <h3 className="font-medium text-gray-900 dark:text-white text-sm leading-5 line-clamp-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                {video.title}
              </h3>
            </Link>

            {/* Channel name */}
            {showChannel && (
              <Link
                href={`/channel/${video.author.id}`}
                className="flex items-center gap-1 mt-1 hover:text-gray-600 transition-colors"
              >
                <span className="text-gray-500 dark:text-gray-400 text-sm truncate">
                  {video.author.channelName}
                </span>
                {video.author.isVerified && (
                  <CheckCircle size={12} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                )}
              </Link>
            )}

            {/* Video stats */}
            <div className="flex items-center gap-2 mt-1 text-gray-500 dark:text-gray-400 text-sm">
              <span>{formatViewCount(video.views)} views</span>
              <span>•</span>
              <span>{timeAgo}</span>
            </div>

            {/* Tags (optional, only show first 2) */}
            {video.tags && video.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {video.tags.slice(0, 2).map((tag, index) => (
                  <Link
                    key={index}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}