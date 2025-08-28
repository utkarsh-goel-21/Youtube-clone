'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Clock, ArrowLeft } from 'lucide-react';
import { RootState } from '@/store/store';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import VideoGrid from '@/components/video/VideoGrid';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import api from '@/services/api';

export default function WatchLaterPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    fetchWatchLaterVideos();
  }, [isAuthenticated]);

  const fetchWatchLaterVideos = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Fetch watch later videos from user's saved list
      const response = await api.get(`/users/${user.id}/watch-later`);
      setVideos(response.data.videos || []);
    } catch (error) {
      console.error('Error fetching watch later videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        } lg:ml-64 pt-16`}>
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

            {/* Page Header */}
            <div className="mb-6 flex items-center gap-3">
              <Clock className="w-8 h-8 text-gray-700 dark:text-gray-400" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Watch Later</h1>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : videos.length > 0 ? (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{videos.length} videos</p>
                <VideoGrid videos={videos} />
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
                <Clock className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  No videos in Watch Later
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Save videos to watch them later. Your saved videos will appear here.
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Browse Videos
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}