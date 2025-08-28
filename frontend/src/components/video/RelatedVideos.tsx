'use client';

import Link from 'next/link';
import { Video } from '../../types/video';
import { formatNumber, formatDuration, formatDate } from '../../utils/formatters';
import { MoreVertical } from 'lucide-react';

interface RelatedVideosProps {
  videos: Video[];
}

export default function RelatedVideos({ videos }: RelatedVideosProps) {
  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Related Videos</h2>
      
      {videos.map((video) => (
        <Link 
          key={video._id} 
          href={`/watch/${video._id}`}
          className="flex space-x-2 group"
        >
          {/* Thumbnail */}
          <div className="relative flex-shrink-0 w-40 h-24">
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/api/placeholder/160/90';
              }}
            />
            {video.duration > 0 && (
              <span className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1 py-0.5 rounded">
                {formatDuration(video.duration)}
              </span>
            )}
          </div>

          {/* Video info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {video.title}
            </h3>
            
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 hover:text-gray-900 dark:hover:text-gray-200">
              {video.author?.channelName || 'Unknown Channel'}
            </p>
            
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span>{formatNumber(video.views)} views</span>
              <span className="mx-1">•</span>
              <span>{formatDate(video.uploadedAt)}</span>
            </div>
          </div>

          {/* Options button */}
          <button 
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full h-fit"
            onClick={(e) => {
              e.preventDefault();
              // Handle options menu
            }}
          >
            <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
          </button>
        </Link>
      ))}

      {/* Load more button */}
      {videos.length >= 10 && (
        <button className="w-full py-2 text-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm">
          Show more
        </button>
      )}
    </div>
  );
}