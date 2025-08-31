'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { likeVideo, dislikeVideo } from '../../store/slices/videoSlice';
import { VideoWithInteraction } from '../../types/video';
import { formatNumber, formatDate } from '../../utils/formatters';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  Download, 
  Flag, 
  BookmarkPlus,
  MoreHorizontal
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SaveToPlaylist from './SaveToPlaylist';

interface VideoInfoProps {
  video: VideoWithInteraction;
}

export default function VideoInfo({ video }: VideoInfoProps) {
  const dispatch = useDispatch();
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleLike = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    try {
      const result = await dispatch(likeVideo(video._id) as any).unwrap();
      console.log('Like result:', result);
    } catch (error) {
      console.error('Failed to like video:', error);
      alert('Failed to like video. Please try again.');
    }
  };

  const handleDislike = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    try {
      const result = await dispatch(dislikeVideo(video._id) as any).unwrap();
      console.log('Dislike result:', result);
    } catch (error) {
      console.error('Failed to dislike video:', error);
      alert('Failed to dislike video. Please try again.');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Video link copied to clipboard!');
      setShowShareMenu(false);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = video.videoUrl;
    link.download = `${video.title}.mp4`;
    link.click();
    setShowMoreMenu(false);
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        router.push('/auth/login');
        return;
      }
      const response = await fetch(`/api/users/${video.author._id}/subscribe`, {
        method: isSubscribed ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setIsSubscribed(!isSubscribed);
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  };

  useEffect(() => {
    // Check if user is subscribed (this should be set from the video response)
    if (video.userInteraction?.isSubscribed !== undefined) {
      setIsSubscribed(video.userInteraction.isSubscribed);
    }
  }, [video]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
      {/* Title */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {video.title}
      </h1>

      {/* Stats and actions */}
      <div className="flex flex-col gap-3 pb-4 border-b">
        {/* View count and date */}
        <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
          <span>{formatNumber(video.views)} views</span>
          <span className="mx-2">•</span>
          <span>{formatDate(video.uploadedAt)}</span>
        </div>

        {/* Action buttons - Scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
          {/* Like/Dislike */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full flex-shrink-0">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-l-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
                video.userInteraction?.liked ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <ThumbsUp size={18} className={video.userInteraction?.liked ? 'fill-current' : ''} />
              <span className="font-medium text-sm sm:text-base">
                {formatNumber(video.likesCount || 0)}
              </span>
            </button>
            
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
            
            <button
              onClick={handleDislike}
              className={`flex items-center px-3 sm:px-4 py-2 rounded-r-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
                video.userInteraction?.disliked ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <ThumbsDown size={18} className={video.userInteraction?.disliked ? 'fill-current' : ''} />
            </button>
          </div>

          {/* Share */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
            >
              <Share2 size={18} />
              <span className="font-medium text-sm sm:text-base">Share</span>
            </button>

            {showShareMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-10">
                <button
                  onClick={handleShare}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors dark:text-gray-300"
                >
                  Copy link
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors dark:text-gray-300">
                  Share on Twitter
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors dark:text-gray-300">
                  Share on Facebook
                </button>
              </div>
            )}
          </div>

          {/* Save */}
          <button 
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0">
            <BookmarkPlus size={18} />
            <span className="font-medium text-sm sm:text-base">Save</span>
          </button>

          {/* More options */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
            >
              <MoreHorizontal size={18} />
            </button>

            {showMoreMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-10">
                <button 
                  onClick={handleDownload}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors dark:text-gray-300 flex items-center space-x-2">
                  <Download size={16} />
                  <span>Download</span>
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center space-x-2">
                  <Flag size={16} />
                  <span>Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Channel info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
        <Link href={`/channel/${video.author._id}`} className="flex-1">
          <div className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            {/* Channel avatar */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
              {video.author.avatar ? (
                <img 
                  src={video.author.avatar} 
                  alt={video.author.channelName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-gray-600 dark:text-gray-300 font-bold text-lg">
                  {video.author.channelName[0].toUpperCase()}
                </span>
              )}
            </div>

            {/* Channel name and subscriber count */}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white flex items-center text-sm sm:text-base">
                <span className="truncate">{video.author.channelName}</span>
                {video.author.isVerified && (
                  <svg className="w-4 h-4 ml-1 text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                )}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {formatNumber(video.author.subscriberCount || 0)} subscribers
              </p>
            </div>
          </div>
        </Link>

        {/* Subscribe button */}
        {video.author._id !== user?._id && (
          <button 
            onClick={handleSubscribe}
            className={`px-4 py-2 font-medium text-sm sm:text-base rounded-full transition-colors flex-shrink-0 ${
              isSubscribed 
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}>
            {isSubscribed ? 'Subscribed' : 'Subscribe'}
          </button>
        )}
      </div>

      {/* Save to Playlist Modal */}
      {showSaveModal && (
        <SaveToPlaylist 
          videoId={video._id} 
          onClose={() => setShowSaveModal(false)} 
        />
      )}
    </div>
  );
}