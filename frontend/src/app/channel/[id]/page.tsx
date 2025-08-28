'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { Calendar, Users, Video, Eye, Settings, Bell, BellOff } from 'lucide-react';
import { RootState } from '@/store/store';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import VideoGrid from '@/components/video/VideoGrid';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatNumber, formatDate } from '@/utils/formatters';
import api from '@/services/api';

interface ChannelData {
  _id: string;
  username: string;
  channelName: string;
  channelDescription?: string;
  avatar?: string;
  banner?: string;
  subscribersCount: number;
  subscriptionsCount: number;
  isSubscribed: boolean;
  isOwner: boolean;
  isVerified?: boolean;
  createdAt: string;
}

interface ChannelStats {
  totalViews: number;
  videosCount: number;
}

export default function ChannelPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [stats, setStats] = useState<ChannelStats>({ totalViews: 0, videosCount: 0 });
  const [activeTab, setActiveTab] = useState('videos');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchChannelData();
  }, [params.id, activeTab, page]);

  const fetchChannelData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/channels/${params.id}`, {
        params: { tab: activeTab, page, limit: 12 }
      });
      
      setChannel(response.data.channel);
      
      if (activeTab === 'videos') {
        if (page === 1) {
          setVideos(response.data.videos);
        } else {
          setVideos(prev => [...prev, ...response.data.videos]);
        }
        setStats({
          totalViews: response.data.totalViews || 0,
          videosCount: response.data.videosCount || 0
        });
        setHasMore(response.data.pagination?.current < response.data.pagination?.pages);
      } else if (activeTab === 'about') {
        setStats({
          totalViews: response.data.totalViews || 0,
          videosCount: response.data.videosCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setSubscribing(true);
    try {
      if (channel?.isSubscribed) {
        // Unsubscribe
        await api.delete(`/users/${channel._id}/subscribe`);
        setChannel(prev => prev ? {
          ...prev,
          isSubscribed: false,
          subscribersCount: Math.max(0, prev.subscribersCount - 1)
        } : null);
      } else {
        // Subscribe
        await api.post(`/users/${channel?._id}/subscribe`);
        setChannel(prev => prev ? {
          ...prev,
          isSubscribed: true,
          subscribersCount: prev.subscribersCount + 1
        } : null);
      }
    } catch (error: any) {
      console.error('Error toggling subscription:', error);
      // Check if error is "Already subscribed" or "Not subscribed" and update state accordingly
      const errorMessage = error?.response?.data?.message || '';
      if (errorMessage.includes('Already subscribed')) {
        setChannel(prev => prev ? { ...prev, isSubscribed: true } : null);
      } else if (errorMessage.includes('Not subscribed')) {
        setChannel(prev => prev ? { ...prev, isSubscribed: false } : null);
      }
    } finally {
      setSubscribing(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  // Helper function to get proper image URL
  const getImageUrl = (path: string | undefined) => {
    if (!path) return null;
    // If it's already a full URL, return as is
    if (path.startsWith('http')) return path;
    // If it's a relative path, prepend the backend URL
    return `http://localhost:5000${path.startsWith('/') ? path : '/' + path}`;
  };

  if (loading && page === 1) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? 'ml-64' : 'ml-0'
          } lg:ml-64 pt-16`}>
            <div className="flex justify-center items-center h-96">
              <LoadingSpinner size="lg" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? 'ml-64' : 'ml-0'
          } lg:ml-64 pt-16`}>
            <div className="flex flex-col items-center justify-center h-96">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Channel not found</h1>
              <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
                Go to homepage
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const bannerUrl = getImageUrl(channel.banner);
  const avatarUrl = getImageUrl(channel.avatar);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        } lg:ml-64 pt-16`}>
          
          {/* Banner */}
          <div className="relative h-32 sm:h-48 md:h-64 lg:h-72 xl:h-80 w-full overflow-hidden">
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Channel banner"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-600 to-blue-600" />
            )}
          </div>

          {/* Channel Header */}
          <div className="bg-white dark:bg-gray-800 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 py-4">
                
                {/* Avatar */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 -mt-10 sm:-mt-12 md:-mt-16 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-800">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={channel.channelName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <span className="text-2xl md:text-4xl font-bold text-gray-600 dark:text-gray-300">
                        {channel.channelName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Channel Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                      {channel.channelName}
                    </h1>
                    {channel.isVerified && (
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">@{channel.username}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatNumber(channel.subscribersCount)} subscribers · {stats.videosCount} videos
                  </p>
                  {channel.channelDescription && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2 max-w-2xl">
                      {channel.channelDescription}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-2 sm:mt-0">
                  {channel.isOwner ? (
                    <Link
                      href="/studio"
                      className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Manage channel</span>
                    </Link>
                  ) : (
                    <button
                      onClick={handleSubscribe}
                      disabled={subscribing}
                      className={`px-4 py-2 rounded-full font-medium flex items-center gap-2 text-sm transition-colors ${
                        channel.isSubscribed
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      } disabled:opacity-50`}
                    >
                      {subscribing ? (
                        <LoadingSpinner size="sm" />
                      ) : channel.isSubscribed ? (
                        <>
                          <BellOff className="w-4 h-4" />
                          <span>Subscribed</span>
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4" />
                          <span>Subscribe</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 sm:gap-8 border-b border-gray-200 dark:border-gray-700 mt-4 overflow-x-auto">
                {['videos', 'playlists', 'community', 'about'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setPage(1);
                    }}
                    className={`pb-3 px-1 capitalize font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab
                        ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {activeTab === 'videos' && (
              <div>
                {videos.length > 0 ? (
                  <>
                    <VideoGrid videos={videos} />
                    {hasMore && (
                      <div className="flex justify-center mt-8">
                        <button
                          onClick={handleLoadMore}
                          disabled={loading}
                          className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                          {loading ? (
                            <>
                              <LoadingSpinner size="sm" />
                              <span className="ml-2">Loading...</span>
                            </>
                          ) : (
                            'Load more'
                          )}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Video className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No videos uploaded yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'playlists' && (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No playlists created yet</p>
              </div>
            )}

            {activeTab === 'community' && (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">Community posts coming soon</p>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="max-w-4xl">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">About</h2>
                  
                  {channel.channelDescription && (
                    <div className="mb-6">
                      <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {channel.channelDescription}
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Stats</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Users className="w-4 h-4" />
                          <span>{formatNumber(channel.subscribersCount)} subscribers</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Video className="w-4 h-4" />
                          <span>{formatNumber(stats.videosCount)} videos</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Eye className="w-4 h-4" />
                          <span>{formatNumber(stats.totalViews)} total views</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Details</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>Joined {formatDate(channel.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}