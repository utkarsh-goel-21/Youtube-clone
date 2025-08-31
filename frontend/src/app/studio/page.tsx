'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Image from 'next/image';
import { 
  Video, Users, Eye, ThumbsUp, Clock, TrendingUp, 
  Settings, Upload, Edit, Trash2, BarChart3, ArrowLeft, Home
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { RootState } from '@/store/store';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatNumber, formatDate, formatDuration } from '@/utils/formatters';
import api from '@/services/api';

interface Analytics {
  overview: {
    totalViews: number;
    totalVideos: number;
    totalLikes: number;
    totalDislikes: number;
    averageViews: number;
    totalWatchTime: number;
  };
  subscribers: {
    current: number;
    change: number;
    changePercent: number;
  };
  topVideos: any[];
}

export default function StudioPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [editingChannel, setEditingChannel] = useState(false);
  const [channelForm, setChannelForm] = useState({
    channelName: '',
    channelDescription: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    fetchData();
  }, [isAuthenticated, activeTab, period]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      if (activeTab === 'dashboard') {
        // Always fetch videos directly to calculate stats (more reliable)
        try {
          // Use my-videos endpoint to ensure we only get current user's videos
          const videosRes = await api.get('/videos/my-videos?limit=1000');
          const userVideos = videosRes.data.videos || [];
          
          // Calculate stats from videos
          const totalViews = userVideos.reduce((sum: number, v: any) => sum + (v.views || 0), 0);
          const totalLikes = userVideos.reduce((sum: number, v: any) => sum + (v.likes?.length || 0), 0);
          const totalDislikes = userVideos.reduce((sum: number, v: any) => sum + (v.dislikes?.length || 0), 0);
          const avgViews = userVideos.length > 0 ? Math.round(totalViews / userVideos.length) : 0;
          
          console.log('Calculated stats:', { totalViews, totalLikes, totalVideos: userVideos.length });
          
          // Get top videos by views
          const sortedVideos = [...userVideos].sort((a, b) => b.views - a.views);
          
          setAnalytics({
            overview: {
              totalViews,
              totalVideos: userVideos.length,
              totalLikes,
              totalDislikes,
              averageViews: avgViews,
              totalWatchTime: 0 // Would need analytics data for this
            },
            subscribers: {
              current: user.subscriberCount || 0,
              change: 0,
              changePercent: 0
            },
            topVideos: sortedVideos.slice(0, 5)
          });
          
          // Also set videos for other tabs
          setVideos(userVideos);
        } catch (err) {
          console.error('Failed to fetch videos for stats:', err);
          setAnalytics({
            overview: {
              totalViews: 0,
              totalVideos: 0,
              totalLikes: 0,
              totalDislikes: 0,
              averageViews: 0,
              totalWatchTime: 0
            },
            subscribers: {
              current: user.subscriberCount || 0,
              change: 0,
              changePercent: 0
            },
            topVideos: []
          });
        }
      } else if (activeTab === 'videos') {
        // Fetch user's videos using my-videos endpoint
        try {
          // Use my-videos endpoint to ensure we only get current user's videos  
          const videosRes = await api.get('/videos/my-videos?limit=1000');
          setVideos(videosRes.data.videos || []);
          
          // Calculate and set analytics from fetched videos
          const userVideos = videosRes.data.videos || [];
          const totalViews = userVideos.reduce((sum: number, v: any) => sum + (v.views || 0), 0);
          const totalLikes = userVideos.reduce((sum: number, v: any) => sum + (v.likes?.length || 0), 0);
          const totalDislikes = userVideos.reduce((sum: number, v: any) => sum + (v.dislikes?.length || 0), 0);
          const avgViews = userVideos.length > 0 ? Math.round(totalViews / userVideos.length) : 0;
          
          setAnalytics({
            overview: {
              totalViews,
              totalVideos: userVideos.length,
              totalLikes,
              totalDislikes,
              averageViews: avgViews,
              totalWatchTime: 0
            },
            subscribers: {
              current: user.subscriberCount || 0,
              change: 0,
              changePercent: 0
            },
            topVideos: [...userVideos].sort((a, b) => b.views - a.views).slice(0, 5)
          });
        } catch (error: any) {
          console.error('Error fetching videos:', error.response?.data || error.message);
          setVideos([]);
        }
      } else if (activeTab === 'channel') {
        // Fetch channel data
        try {
          const channelRes = await api.get(`/channels/${user._id || user.id}`);
          const channelData = channelRes.data.channel;
          setChannelForm({
            channelName: channelData.channelName || user.channelName || '',
            channelDescription: channelData.channelDescription || ''
          });
        } catch (error) {
          setChannelForm({
            channelName: user.channelName || '',
            channelDescription: user.channelDescription || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChannel = async () => {
    if (!user) return;
    
    try {
      await api.put(`/channels/${user._id || user.id}`, channelForm);
      setEditingChannel(false);
      alert('Channel updated successfully!');
      // Refresh user data
      fetchData();
    } catch (error) {
      console.error('Error updating channel:', error);
      alert('Failed to update channel');
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) return;
    
    try {
      const response = await api.delete(`/videos/${videoId}`);
      console.log('Delete response:', response);
      
      if (response.status === 200 || response.status === 204) {
        // Successfully deleted from backend
        setVideos(videos.filter(v => v._id !== videoId));
        alert('Video deleted successfully!');
        
        // Update analytics if on dashboard
        if (activeTab === 'dashboard' && analytics) {
          setAnalytics({
            ...analytics,
            overview: {
              ...analytics.overview,
              totalVideos: analytics.overview.totalVideos - 1
            }
          });
        }
      } else {
        alert('Failed to delete video. Please try again.');
      }
    } catch (error: any) {
      console.error('Error deleting video:', error);
      alert(`Failed to delete video: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEditVideo = (videoId: string) => {
    // Navigate to edit page or open edit modal
    router.push(`/studio/video/${videoId}/edit`);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading && !analytics && videos.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onMenuClick={() => {}} />
      
      <div className="flex">
        <Sidebar isOpen={false} onClose={() => {}} />
        
        <main className="flex-1 lg:ml-64 pt-16">
          <div className="container mx-auto px-4 py-6">
            {/* Back Navigation */}
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Home
              </button>
            </div>
            
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">YouTube Studio</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Channel: {user?.channelName || user?.username}
              </p>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
              <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700 px-6">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'videos', label: 'Content', icon: Video },
          { id: 'channel', label: 'Channel', icon: Settings }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-4 px-1 flex items-center gap-2 font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-red-600 border-red-600'
                : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
              </div>
            </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && analytics && (
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="flex justify-end">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <Eye className="w-8 h-8 text-red-600" />
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(analytics.overview.totalViews)}</p>
              <p className="text-gray-600 dark:text-gray-400">Total Views</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-green-600" />
                {analytics.subscribers?.change > 0 && (
                  <span className="text-green-500 text-sm">
                    +{analytics.subscribers.change}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(analytics.subscribers?.current || 0)}</p>
              <p className="text-gray-600 dark:text-gray-400">Subscribers</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.floor(analytics.overview.totalWatchTime / 60)}h
              </p>
              <p className="text-gray-600 dark:text-gray-400">Watch Time</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <ThumbsUp className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(analytics.overview.totalLikes)}</p>
              <p className="text-gray-600 dark:text-gray-400">Total Likes</p>
            </div>
          </div>

          {/* Top Videos */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Top Videos</h2>
            <div className="space-y-4">
              {analytics.topVideos.map((video, index) => (
                <div key={video._id} className="flex items-start gap-4">
                  <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">#{index + 1}</span>
                  <div className="relative w-32 h-20">
                    <Image
                      src={video.thumbnailUrl || '/video-placeholder.jpg'}
                      alt={video.title}
                      fill
                      className="rounded object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">{video.title}</h3>
                    <div className="flex gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <span>{formatNumber(video.views)} views</span>
                      <span>{formatNumber(video.likes.length)} likes</span>
                      <span>{formatDate(video.uploadedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Videos Tab */}
      {activeTab === 'videos' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Videos</h2>
            <button
              onClick={() => router.push('/upload')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Video
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-gray-200">Video</th>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-gray-200">Visibility</th>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-gray-200">Date</th>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-gray-200">Views</th>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-gray-200">Likes</th>
                  <th className="px-4 py-3 text-left text-gray-900 dark:text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {videos.map((video) => (
                  <tr key={video._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-24 h-14">
                          <Image
                            src={video.thumbnailUrl || '/video-placeholder.jpg'}
                            alt={video.title}
                            fill
                            className="rounded object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{video.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDuration(video.duration)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        video.isPublic 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {video.isPublic ? 'Public' : 'Private'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(video.uploadedAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-200">{formatNumber(video.views)}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-200">{formatNumber(video.likes.length)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/watch/${video._id}`)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditVideo(video._id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(video._id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {videos.length === 0 && (
              <div className="text-center py-8">
                <Video className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No videos uploaded yet</p>
                <button
                  onClick={() => router.push('/upload')}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Upload your first video
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Channel Settings Tab */}
      {activeTab === 'channel' && (
        <div className="max-w-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Channel Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={channelForm.channelName}
                  onChange={(e) => setChannelForm({...channelForm, channelName: e.target.value})}
                  disabled={!editingChannel}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                  Channel Description
                </label>
                <textarea
                  value={channelForm.channelDescription}
                  onChange={(e) => setChannelForm({...channelForm, channelDescription: e.target.value})}
                  disabled={!editingChannel}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  placeholder="Tell viewers about your channel"
                />
              </div>

              <div className="flex gap-3">
                {!editingChannel ? (
                  <button
                    onClick={() => setEditingChannel(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Edit Channel
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleUpdateChannel}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingChannel(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-200"
                    >
                      Cancel
                    </button>
                  </>
                )}
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