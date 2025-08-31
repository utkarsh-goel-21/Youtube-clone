'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'next/navigation';
import { RootState } from '../store/store';
import { setVideos, setLoading, appendVideos } from '../store/slices/videoSlice';
import { videoService } from '../services/videoService';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import VideoGrid from '../components/video/VideoGrid';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import InfiniteScroll from '../components/ui/InfiniteScroll';
import type { Video } from '../types/video';

const categories = [
  'All',
  'Music',
  'Gaming',
  'Education',
  'Entertainment',
  'Sports',
  'News',
  'Technology',
  'Comedy',
  'Film',
  'Howto'
];

function HomeContent() {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get('category');
  const { videos, loading } = useSelector((state: RootState) => state.videos);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || 'All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchVideos = async (category: string, pageNum: number, append: boolean = false) => {
    try {
      if (!append) {
        dispatch(setLoading(true));
      } else {
        setLoadingMore(true);
      }

      // Use recommended endpoint for homepage to get fresh videos
      const response = category === 'All' && pageNum === 1 
        ? await videoService.getRecommendedVideos()
        : await videoService.getVideos({
            page: pageNum,
            limit: 12,
            category: category === 'All' ? undefined : category,
            sortBy: 'uploadedAt'
          });

      console.log('Homepage: Fetched videos response:', response);
      console.log('Homepage: Number of videos:', response?.videos?.length);

      if (response && response.videos) {
        if (append) {
          dispatch(appendVideos(response.videos));
        } else {
          dispatch(setVideos(response.videos));
        }
        
        // Check if we have more pages and if videos were returned
        const hasMorePages = response.pagination && 
                            response.pagination.current < response.pagination.pages &&
                            response.videos.length > 0;
        setHasMore(hasMorePages || false);
      } else {
        // No videos returned, stop loading
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setHasMore(false); // Stop trying to load more on error
    } finally {
      dispatch(setLoading(false));
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const newCategory = categoryParam || 'All';
    setSelectedCategory(newCategory);
  }, [categoryParam]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchVideos(selectedCategory, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
    setHasMore(true);
  };

  const loadMoreVideos = useCallback(async () => {
    if (!loadingMore && hasMore && videos.length > 0) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchVideos(selectedCategory, nextPage, true);
    }
  }, [page, loadingMore, hasMore, selectedCategory, videos.length]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex relative">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'ml-0'
        } lg:ml-64 pt-14 sm:pt-16 min-h-screen overflow-x-hidden`}>
          <div className="w-full px-2 sm:px-4 py-4 sm:py-6">
            {/* Category filters */}
            <div className="mb-6 overflow-x-auto -mx-2 sm:-mx-4 px-2 sm:px-4">
              <div className="flex gap-2 pb-2 min-w-max">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                      selectedCategory === category
                        ? 'bg-gray-900 dark:bg-red-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Page title */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedCategory === 'All' ? 'Recommended' : selectedCategory}
              </h1>
            </div>
            
            {/* Videos grid with infinite scroll */}
            {loading && page === 1 ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
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
                      No more videos to load
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

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HomeContent />
    </Suspense>
  );
}