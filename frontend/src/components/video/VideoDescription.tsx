'use client';

import { useState } from 'react';
import { VideoWithInteraction } from '../../types/video';
import { formatDate } from '../../utils/formatters';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface VideoDescriptionProps {
  video: VideoWithInteraction;
}

export default function VideoDescription({ video }: VideoDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const description = video.description || 'No description provided.';
  const shouldShowToggle = description.length > 200;
  const displayDescription = isExpanded ? description : description.slice(0, 200);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(video.uploadedAt, true)}
        </span>
        {video.category && (
          <>
            <span className="mx-2 text-gray-400">•</span>
            <span className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
              #{video.category}
            </span>
          </>
        )}
      </div>

      <div className="whitespace-pre-wrap text-gray-900 dark:text-white">
        {displayDescription}
        {!isExpanded && shouldShowToggle && '...'}
      </div>

      {video.tags && video.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {video.tags.map((tag, index) => (
            <span
              key={index}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {shouldShowToggle && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 flex items-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium text-sm"
        >
          {isExpanded ? (
            <>
              Show less <ChevronUp size={16} className="ml-1" />
            </>
          ) : (
            <>
              Show more <ChevronDown size={16} className="ml-1" />
            </>
          )}
        </button>
      )}
    </div>
  );
}