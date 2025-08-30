'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '../../store/store';
import { setVideos, setLoading } from '../../store/slices/videoSlice';
import { videoService } from '../../services/videoService';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import VideoGrid from '../../components/video/VideoGrid';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import InfiniteScroll from '../../components/ui/InfiniteScroll';
import { History, Clock, Trash2, Search, Calendar, Filter, PauseCircle, CheckCircle } from 'lucide-react';
import type { Video } from '../../types/video';

interface WatchHistoryItem {
  video: Video;
  watchedAt: string;
  watchTime: number;
  percentageWatched: number;
}

export default function HistoryPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { videos, loading } = useSelector((state: RootState) => state.videos);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/history');
    }
  }, [isAuthenticated, router]);

  const fetchHistory = async (pageNum: number, append: boolean = false, filterToUse?: string) => {
    const currentFilter = filterToUse || filterType;
    console.log('Fetching history:', currentFilter, 'page:', pageNum);
    
    if (!isAuthenticated) {
      return;
    }
    
    try {
      if (!append) {
        dispatch(setLoading(true));
      } else {
        setLoadingMore(true);
      }

      // Fetch watch history from API
      const response = await videoService.getWatchHistory({
        page: pageNum,
        limit: 20,
        filter: currentFilter as any
      });

      console.log('History response:', response);
      console.log('Response received, videos:', response?.videos?.length || 0);

      // Check if we have videos in response
      if (response && response.videos && response.videos.length > 0) {
        // Transform to history items with metadata
        const items: WatchHistoryItem[] = response.videos.map((video: any) => ({
          video,
          watchedAt: video.lastWatchedAt || new Date().toISOString(),
          watchTime: video.watchTime || 0,
          percentageWatched: video.percentageWatched || 0
        }));

        if (append) {
          setHistoryItems(prev => [...prev, ...items]);
        } else {
          setHistoryItems([...items]);
        }

        // Extract just videos for the grid
        const videosOnly = items.map(item => item.video);
        dispatch(setVideos(videosOnly));

        setHasMore(
          response.pagination?.current !== undefined && 
          response.pagination?.pages !== undefined &&
          response.pagination.current < response.pagination.pages
        );
      } else {
        // No videos in response or empty array
        if (!append) {
          setHistoryItems([]);
          dispatch(setVideos([]));
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      // For now, show empty state
      if (!append) {
        setHistoryItems([]);
        dispatch(setVideos([]));
      }
      setHasMore(false);
    } finally {
      dispatch(setLoading(false));
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated && !isPaused) {
      // Add small delay to ensure auth is ready
      const timer = setTimeout(() => {
        fetchHistory(1, false, filterType);
        setPage(1);
        setHasMore(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [filterType, isAuthenticated, isPaused]);

  const loadMoreHistory = useCallback(async () => {
    if (!loadingMore && hasMore && !isPaused) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchHistory(nextPage, true);
    }
  }, [page, loadingMore, hasMore, isPaused]);

  const clearHistory = async () => {
    if (confirm('Are you sure you want to clear your watch history? This cannot be undone.')) {
      try {
        // Call API to clear history
        await videoService.clearWatchHistory();
        setHistoryItems([]);
        dispatch(setVideos([]));
      } catch (error) {
        console.error('Error clearing history:', error);
        alert('Failed to clear history. Please try again.');
      }
    }
  };

  const toggleHistoryTracking = () => {
    setIsPaused(!isPaused);
    // In production, this would also update user preferences via API
  };

  const removeFromHistory = async (videoId: string) => {
    try {
      // Call API to remove video from history
      await videoService.removeFromHistory(videoId);
      
      // Update local state
      setHistoryItems(historyItems.filter(item => item.video._id !== videoId));
      dispatch(setVideos(videos.filter((v: Video) => v._id !== videoId)));
    } catch (error) {
      console.error('Error removing from history:', error);
    }
  };

  // Filter history items based on search
  const filteredItems = historyItems.filter(item =>
    searchQuery === '' || 
    item.video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.video.author?.channelName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVideos = filteredItems.map(item => item.video);
  

  if (!isAuthenticated) {
    return null; // Will redirect to login
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
            {/* Page header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full text-white">
                    <History size={28} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Watch History</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {isPaused ? 'History paused' : `${filteredItems.length} videos watched`}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={toggleHistoryTracking}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isPaused 
                        ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/30' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {isPaused ? <PauseCircle size={20} /> : <CheckCircle size={20} />}
                    <span className="hidden sm:inline">
                      {isPaused ? 'History Paused' : 'History On'}
                    </span>
                  </button>
                  
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 size={20} />
                    <span className="hidden sm:inline">Clear History</span>
                  </button>
                </div>
              </div>

              {/* Search and filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search bar */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search in history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={20} />
                </div>

                {/* Filter buttons */}
                <div className="flex gap-2">
                  {(['all', 'today', 'week', 'month'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setFilterType(filter)}
                      className={`px-4 py-2 rounded-lg transition-colors capitalize ${
                        filterType === filter
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {filter === 'all' ? 'All Time' : filter === 'week' ? 'This Week' : filter === 'month' ? 'This Month' : 'Today'}
                    </button>
                  ))}
                </div>
              </div>

              {/* History paused notice */}
              {isPaused && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                    <PauseCircle size={20} />
                    <p>
                      Your watch history is paused. Videos you watch won't be saved to your history until you resume.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* History groups by date */}
            {loading && page === 1 ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <History size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchQuery ? 'No results found' : 'No watch history'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  {searchQuery 
                    ? `No videos matching "${searchQuery}" in your history`
                    : 'Videos you watch will appear here. Start watching to build your history.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <InfiniteScroll
                loadMore={loadMoreHistory}
                hasMore={hasMore && !isPaused}
                loading={loadingMore}
                loader={
                  <div className="flex justify-center items-center py-8">
                    <LoadingSpinner size="md" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading more history...</span>
                  </div>
                }
                endMessage={
                  filteredVideos.length > 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {isPaused ? 'History tracking is paused' : 'No more history to load'}
                    </div>
                  )
                }
                threshold={200}
              >
                {/* History sections by date */}
                <div className="space-y-8">
                  {/* Group videos by date */}
                  {(() => {
                    const groups = new Map<string, WatchHistoryItem[]>();
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    filteredItems.forEach(item => {
                      const date = new Date(item.watchedAt);
                      let key: string;
                      
                      if (date.toDateString() === today.toDateString()) {
                        key = 'Today';
                      } else if (date.toDateString() === yesterday.toDateString()) {
                        key = 'Yesterday';
                      } else {
                        key = date.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        });
                      }
                      
                      if (!groups.has(key)) {
                        groups.set(key, []);
                      }
                      groups.get(key)!.push(item);
                    });
                    
                    return Array.from(groups.entries()).map(([date, items]) => (
                      <div key={date}>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Calendar size={20} />
                          {date}
                        </h2>
                        <VideoGrid videos={items.map(item => item.video)} />
                      </div>
                    ));
                  })()}
                </div>
              </InfiniteScroll>
            )}

            {/* Stats section */}
            {filteredItems.length > 0 && (
              <div className="mt-12 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">History Statistics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Videos Watched</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredItems.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Watch Time</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.round(filteredItems.reduce((sum, item) => sum + item.watchTime, 0) / 60)} min
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Average Completion</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.round(
                        filteredItems.reduce((sum, item) => sum + item.percentageWatched, 0) / 
                        filteredItems.length || 0
                      )}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Unique Channels</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {new Set(filteredItems.map(item => item.video.author?.id)).size}
                    </p>
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