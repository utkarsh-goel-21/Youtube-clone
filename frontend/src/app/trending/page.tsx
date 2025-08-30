'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setVideos, setLoading, appendVideos } from '../../store/slices/videoSlice';
import { videoService } from '../../services/videoService';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import VideoGrid from '../../components/video/VideoGrid';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import InfiniteScroll from '../../components/ui/InfiniteScroll';
import { TrendingUp, Flame, Award, Star } from 'lucide-react';
import type { Video } from '../../types/video';

const trendingCategories = [
  { id: 'now', label: 'Now', icon: Flame, color: 'text-red-600' },
  { id: 'music', label: 'Music', icon: Award, color: 'text-purple-600' },
  { id: 'gaming', label: 'Gaming', icon: Star, color: 'text-blue-600' },
  { id: 'movies', label: 'Movies', icon: TrendingUp, color: 'text-green-600' },
];

export default function TrendingPage() {
  const dispatch = useDispatch();
  const { videos, loading } = useSelector((state: RootState) => state.videos);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('now');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  

  const fetchTrendingVideos = async (category: string, pageNum: number, append: boolean = false) => {
    try {
      if (!append) {
        dispatch(setLoading(true));
      } else {
        setLoadingMore(true);
      }

      // Use recommended endpoint for first page like homepage does
      const response = category === 'now' && pageNum === 1
        ? await videoService.getRecommendedVideos()
        : await videoService.getVideos({
            page: pageNum,
            limit: 20,
            category: category === 'now' ? undefined : category,
            sortBy: 'uploadedAt',
            sortOrder: 'desc'
          });

      console.log('Trending: Got', response.videos?.length || 0, 'videos');
      
      if (response && response.videos) {
        if (append) {
          dispatch(appendVideos(response.videos));
        } else {
          dispatch(setVideos(response.videos));
        }
        
        // Check if we have more pages
        const hasMorePages = response.pagination && 
                            response.pagination.current < response.pagination.pages &&
                            response.videos.length > 0;
        setHasMore(hasMorePages || false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching trending videos:', error);
    } finally {
      dispatch(setLoading(false));
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Fetch fresh data when category changes
    setPage(1);
    setHasMore(true);
    fetchTrendingVideos(selectedCategory, 1);
  }, [selectedCategory]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
    setHasMore(true);
  };

  const loadMoreVideos = useCallback(async () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      
      // For trending, we'll fetch regular videos after the first page
      if (nextPage > 1) {
        try {
          setLoadingMore(true);
          const response = await videoService.getVideos({
            page: nextPage,
            limit: 12,
            category: selectedCategory === 'now' ? undefined : selectedCategory,
            sortBy: 'views',
            sortOrder: 'desc'
          });
          
          dispatch(setVideos([...videos, ...response.videos]));
          setHasMore(
            response.pagination?.current !== undefined && 
            response.pagination?.pages !== undefined &&
            response.pagination.current < response.pagination.pages
          );
        } catch (error) {
          console.error('Error loading more videos:', error);
        } finally {
          setLoadingMore(false);
        }
      }
    }
  }, [page, loadingMore, hasMore, selectedCategory, videos, dispatch]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        } lg:ml-64 pt-16`}>
          <div className="container mx-auto px-4 py-6">
            {/* Page header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-red-500 to-pink-500 rounded-full text-white">
                  <TrendingUp size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trending</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Discover what's popular right now</p>
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-px">
                {trendingCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryChange(category.id)}
                      className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-all border-b-2 ${
                        selectedCategory === category.id
                          ? `${category.color} border-current font-medium`
                          : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Trending Now</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{videos.length}</p>
                  </div>
                  <Flame className="text-red-500" size={24} />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Views</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {videos.reduce((sum: number, v: any) => sum + (v.views || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <Award className="text-purple-500" size={24} />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Views</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {videos.length > 0 
                        ? Math.round(videos.reduce((sum: number, v: any) => sum + (v.views || 0), 0) / videos.length).toLocaleString()
                        : '0'
                      }
                    </p>
                  </div>
                  <Star className="text-yellow-500" size={24} />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Category</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                      {selectedCategory === 'now' ? 'All' : selectedCategory}
                    </p>
                  </div>
                  <TrendingUp className="text-green-500" size={24} />
                </div>
              </div>
            </div>
            
            {/* Videos grid with infinite scroll */}
            {loading && page === 1 ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <TrendingUp size={32} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No trending videos</h3>
                <p className="text-gray-600 dark:text-gray-400">Check back later for trending content</p>
              </div>
            ) : (
              <InfiniteScroll
                loadMore={loadMoreVideos}
                hasMore={hasMore}
                loading={loadingMore}
                loader={
                  <div className="flex justify-center items-center py-8">
                    <LoadingSpinner size="md" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading more videos...</span>
                  </div>
                }
                endMessage={
                  videos.length > 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No more trending videos to load
                    </div>
                  )
                }
                threshold={200}
              >
                <VideoGrid videos={videos} />
              </InfiniteScroll>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}