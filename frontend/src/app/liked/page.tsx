'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Heart, ArrowLeft } from 'lucide-react';
import { RootState } from '@/store/store';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import VideoGrid from '@/components/video/VideoGrid';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import api from '@/services/api';

export default function LikedVideosPage() {
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
    fetchLikedVideos();
  }, [isAuthenticated]);

  const fetchLikedVideos = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Fetch liked videos
      const response = await api.get(`/users/${user.id}/liked-videos`);
      setVideos(response.data.videos || []);
    } catch (error) {
      console.error('Error fetching liked videos:', error);
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
              <Heart className="w-8 h-8 text-red-600 fill-current" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Liked Videos</h1>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : videos.length > 0 ? (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{videos.length} liked videos</p>
                <VideoGrid videos={videos} />
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
                <Heart className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  No liked videos yet
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Videos you like will appear here. Start exploring and like videos you enjoy!
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Explore Videos
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}