import React, { useEffect, useCallback, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import LoadingSpinner from './LoadingSpinner';

interface InfiniteScrollProps {
  children: React.ReactNode;
  loadMore: () => Promise<void> | void;
  hasMore: boolean;
  loading?: boolean;
  loader?: React.ReactNode;
  endMessage?: React.ReactNode;
  threshold?: number;
  className?: string;
}

const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  children,
  loadMore,
  hasMore,
  loading = false,
  loader = <LoadingSpinner />,
  endMessage = <p className="text-center text-gray-500 py-4">No more items to load</p>,
  threshold = 100,
  className = ''
}) => {
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: `${threshold}px`,
  });
  
  const loadingRef = useRef(false);

  const handleLoadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || loading) return;
    
    loadingRef.current = true;
    try {
      await loadMore();
    } finally {
      loadingRef.current = false;
    }
  }, [loadMore, hasMore, loading]);

  useEffect(() => {
    if (inView && hasMore && !loading) {
      handleLoadMore();
    }
  }, [inView, hasMore, loading, handleLoadMore]);

  return (
    <div className={className}>
      {children}
      
      {hasMore && (
        <div ref={ref} className="w-full py-4 flex justify-center">
          {loading && loader}
        </div>
      )}
      
      {!hasMore && !loading && endMessage}
    </div>
  );
};

export default InfiniteScroll;