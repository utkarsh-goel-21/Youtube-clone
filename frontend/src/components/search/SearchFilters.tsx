'use client';

import { X, Clock, Timer, Film, SortDesc } from 'lucide-react';

interface SearchFiltersProps {
  filters: {
    uploadDate: string;
    duration: string;
    type: string;
    sortBy: string;
  };
  onChange: (filters: any) => void;
  onClose: () => void;
}

export default function SearchFilters({ filters, onChange, onClose }: SearchFiltersProps) {
  const handleFilterChange = (category: string, value: string) => {
    onChange({ [category]: value });
  };

  return (
    <div className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Search filters</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Upload date filter */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
              <Clock size={16} />
              <span>Upload date</span>
            </div>
            <div className="space-y-2">
              {[
                { value: 'all', label: 'Any time' },
                { value: 'hour', label: 'Last hour' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This week' },
                { value: 'month', label: 'This month' },
                { value: 'year', label: 'This year' }
              ].map(option => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="uploadDate"
                    value={option.value}
                    checked={filters.uploadDate === option.value}
                    onChange={(e) => handleFilterChange('uploadDate', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Duration filter */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
              <Timer size={16} />
              <span>Duration</span>
            </div>
            <div className="space-y-2">
              {[
                { value: 'all', label: 'Any duration' },
                { value: 'short', label: 'Under 4 minutes' },
                { value: 'medium', label: '4-20 minutes' },
                { value: 'long', label: 'Over 20 minutes' }
              ].map(option => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="duration"
                    value={option.value}
                    checked={filters.duration === option.value}
                    onChange={(e) => handleFilterChange('duration', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Type filter */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
              <Film size={16} />
              <span>Type</span>
            </div>
            <div className="space-y-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'video', label: 'Video' },
                { value: 'channel', label: 'Channel' },
                { value: 'playlist', label: 'Playlist' }
              ].map(option => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={option.value}
                    checked={filters.type === option.value}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sort by filter */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-700">
              <SortDesc size={16} />
              <span>Sort by</span>
            </div>
            <div className="space-y-2">
              {[
                { value: 'relevance', label: 'Relevance' },
                { value: 'date', label: 'Upload date' },
                { value: 'views', label: 'View count' },
                { value: 'rating', label: 'Rating' }
              ].map(option => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sortBy"
                    value={option.value}
                    checked={filters.sortBy === option.value}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t">
          <button
            onClick={() => onChange({
              uploadDate: 'all',
              duration: 'all',
              type: 'all',
              sortBy: 'relevance'
            })}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Reset all
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}