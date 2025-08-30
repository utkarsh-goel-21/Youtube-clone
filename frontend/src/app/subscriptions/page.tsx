'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import Image from 'next/image';
import { Bell, BellOff, Video, Users, Calendar } from 'lucide-react';
import { RootState } from '@/store/store';
import VideoCard from '@/components/video/VideoCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatNumber, formatDate } from '@/utils/formatters';
import api from '@/services/api';

interface Subscription {
  _id: string;
  username: string;
  channelName: string;
  avatar?: string;
  subscriberCount: number;
  isVerified?: boolean;
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [activeTab, setActiveTab] = useState('videos');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/subscriptions');
      return;
    }
    
    fetchData();
  }, [isAuthenticated, activeTab, page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'videos') {
        // Fetch subscription feed videos
        const response = await api.get('/videos/subscriptions', {
          params: { page, limit: 12 }
        });
        
        if (page === 1) {
          setVideos(response.data.videos);
        } else {
          setVideos(prev => [...prev, ...response.data.videos]);
        }
        
        setHasMore(
          response.data.pagination?.current !== undefined && 
          response.data.pagination?.pages !== undefined &&
          response.data.pagination.current < response.data.pagination.pages
        );
      } else if (activeTab === 'channels') {
        // Fetch subscribed channels
        const response = await api.get('/users/subscriptions/me');
        setSubscriptions(response.data.subscriptions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // If no subscription feed endpoint, fetch from each subscribed channel
      if (activeTab === 'videos') {
        fetchAlternativeVideos();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAlternativeVideos = async () => {
    try {
      // First get subscriptions
      const subsResponse = await api.get('/users/subscriptions/me');
      const subs = subsResponse.data.subscriptions;
      setSubscriptions(subs);
      
      // Then fetch recent videos from each channel
      const videoPromises = subs.map((sub: Subscription) =>
        api.get(`/channels/${sub._id}`, { params: { tab: 'videos', limit: 3 } })
          .then(res => res.data.videos)
          .catch(() => [])
      );
      
      const videoArrays = await Promise.all(videoPromises);
      const allVideos = videoArrays.flat();
      
      // Sort by upload date
      allVideos.sort((a, b) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
      
      setVideos(allVideos);
      setHasMore(false);
    } catch (error) {
      console.error('Error fetching alternative videos:', error);
    }
  };

  const handleUnsubscribe = async (channelId: string) => {
    try {
      await api.delete(`/users/${channelId}/subscribe`);
      setSubscriptions(prev => prev.filter(sub => sub._id !== channelId));
      // Remove videos from this channel
      setVideos(prev => prev.filter(video => video.author._id !== channelId));
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading && page === 1) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8 bg-white dark:bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Subscriptions</h1>
      
      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => {
            setActiveTab('videos');
            setPage(1);
          }}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'videos'
              ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Videos
        </button>
        <button
          onClick={() => {
            setActiveTab('channels');
            setPage(1);
          }}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'channels'
              ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Channels ({subscriptions.length})
        </button>
      </div>

      {/* Videos Tab */}
      {activeTab === 'videos' && (
        <div>
          {videos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No videos from your subscriptions</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Subscribe to channels to see their latest videos here
              </p>
              <Link
                href="/"
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
              >
                Explore videos
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {videos.map((video) => (
                  <VideoCard key={video._id} video={video} />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    {loading ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <div>
          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No subscriptions yet</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Find channels you like and subscribe to get their latest videos
              </p>
              <Link
                href="/"
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
              >
                Discover channels
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions.map((channel) => (
                <div
                  key={channel._id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 hover:shadow-lg transition-shadow"
                >
                  <Link href={`/channel/${channel._id}`}>
                    <div className="flex items-start gap-4">
                      <div className="relative w-20 h-20">
                        <Image
                          src={channel.avatar || '/default-avatar.png'}
                          alt={channel.channelName}
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                            {channel.channelName}
                          </h3>
                          {channel.isVerified && (
                            <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          @{channel.username}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {formatNumber(channel.subscriberCount)} subscribers
                        </p>
                      </div>
                    </div>
                  </Link>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleUnsubscribe(channel._id)}
                      className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-full text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-2"
                    >
                      <BellOff className="w-4 h-4" />
                      Unsubscribe
                    </button>
                    <Link
                      href={`/channel/${channel._id}`}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 text-center"
                    >
                      Visit Channel
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}