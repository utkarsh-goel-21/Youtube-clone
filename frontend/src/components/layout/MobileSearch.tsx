'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Search, ArrowLeft } from 'lucide-react';

interface MobileSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSearch({ isOpen, onClose }: MobileSearchProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 sm:hidden">
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Close search"
        >
          <ArrowLeft size={24} className="text-gray-700 dark:text-gray-300" />
        </button>
        
        <form onSubmit={handleSearch} className="flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos..."
            className="flex-1 px-3 py-2 bg-transparent focus:outline-none text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Search"
          >
            <Search size={24} className="text-gray-700 dark:text-gray-300" />
          </button>
        </form>
      </div>
    </div>
  );
}