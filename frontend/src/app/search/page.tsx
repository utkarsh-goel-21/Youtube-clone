'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { searchVideos, setLoading } from '../../store/slices/videoSlice';
import { videoService } from '../../services/videoService';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import VideoCard from '../../components/video/VideoCard';
import ChannelCard from '../../components/search/ChannelCard';
import SearchFilters from '../../components/search/SearchFilters';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Search, Filter, X } from 'lucide-react';
import type { Video } from '../../types/video';

interface SearchFilters {
  uploadDate: 'all' | 'hour' | 'today' | 'week' | 'month' | 'year';
  duration: 'all' | 'short' | 'medium' | 'long';
  type: 'all' | 'video' | 'channel' | 'playlist';
  sortBy: 'relevance' | 'date' | 'views' | 'rating';
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') || '';
  
  const dispatch = useDispatch();
  const { searchResults, loading } = useSelector((state: RootState) => state.videos);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    uploadDate: 'all',
    duration: 'all',
    type: 'all',
    sortBy: 'relevance'
  });
  const [channels, setChannels] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);

  const performSearch = useCallback(async () => {
    if (!query) return;
    
    try {
      dispatch(setLoading(true));
      
      // Search videos
      if (filters.type === 'all' || filters.type === 'video') {
        const searchParams = {
          q: query,
          uploadDate: filters.uploadDate,
          duration: filters.duration,
          sortBy: filters.sortBy
        };
        
        dispatch(searchVideos(searchParams) as any);
      }
      
      // Search channels (mock for now)
      if (filters.type === 'all' || filters.type === 'channel') {
        // This would be a separate API call
        setChannels([]);
      }
      
      // Search playlists (mock for now)
      if (filters.type === 'all' || filters.type === 'playlist') {
        // This would be a separate API call
        setPlaylists([]);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      dispatch(setLoading(false));
    }
  }, [query, filters, dispatch]);

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query, filters, performSearch]);

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilter = (filterKey: keyof SearchFilters) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: filterKey === 'sortBy' ? 'relevance' : 'all'
    }));
  };

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => {
      if (key === 'sortBy') return value !== 'relevance';
      return value !== 'all';
    }
  ).length;

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Search size={80} className="text-gray-300 mb-4" />
        <h2 className="text-2xl font-medium text-gray-700 dark:text-gray-300 mb-2">
          Start searching
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Enter a search term to find videos, channels, and playlists
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Search header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-16 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-medium text-gray-900 dark:text-white">
              Search results for "<span className="font-semibold">{query}</span>"
            </h1>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
            >
              <Filter size={18} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-blue-600 dark:bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
          
          {/* Active filters */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {filters.uploadDate !== 'all' && (
                <FilterChip
                  label={`Upload date: ${filters.uploadDate}`}
                  onRemove={() => clearFilter('uploadDate')}
                />
              )}
              {filters.duration !== 'all' && (
                <FilterChip
                  label={`Duration: ${filters.duration}`}
                  onRemove={() => clearFilter('duration')}
                />
              )}
              {filters.type !== 'all' && (
                <FilterChip
                  label={`Type: ${filters.type}`}
                  onRemove={() => clearFilter('type')}
                />
              )}
              {filters.sortBy !== 'relevance' && (
                <FilterChip
                  label={`Sort by: ${filters.sortBy}`}
                  onRemove={() => clearFilter('sortBy')}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <SearchFilters
          filters={filters}
          onChange={handleFilterChange}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Search results */}
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Channels section */}
            {channels.length > 0 && filters.type !== 'video' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Channels</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {channels.map((channel) => (
                    <ChannelCard key={channel._id} channel={channel} />
                  ))}
                </div>
              </div>
            )}

            {/* Videos section */}
            {searchResults.length > 0 ? (
              <div>
                {filters.type === 'all' && (
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Videos</h2>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {searchResults.map((video) => (
                    <SearchVideoCard key={video._id} video={video} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search size={60} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  No results found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  Try different keywords or remove search filters
                </p>
              </div>
            )}

            {/* Playlists section */}
            {playlists.length > 0 && filters.type !== 'video' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Playlists</h2>
                <div className="space-y-4">
                  {/* Playlist cards would go here */}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function SearchVideoCard({ video }: { video: Video }) {
  return (
    <div className="flex gap-4 group">
      <VideoCard video={video} showChannel={true} />
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-900 dark:text-white">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function SearchPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        } lg:ml-64 pt-16`}>
          <Suspense fallback={
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          }>
            <SearchContent />
          </Suspense>
        </main>
      </div>
    </div>
  );
}