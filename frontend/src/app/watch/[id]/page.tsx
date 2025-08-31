'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store/store';
import { 
  fetchVideoById, 
  fetchRelatedVideos, 
  likeVideo, 
  dislikeVideo 
} from '../../../store/slices/videoSlice';
import { fetchComments } from '../../../store/slices/commentSlice';
import Header from '../../../components/layout/Header';
import Sidebar from '../../../components/layout/Sidebar';
import VideoPlayer from '../../../components/video/VideoPlayer';
import VideoInfo from '../../../components/video/VideoInfo';
import VideoDescription from '../../../components/video/VideoDescription';
import RelatedVideos from '../../../components/video/RelatedVideos';
import CommentSection from '../../../components/comment/CommentSection';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

export default function WatchPage() {
  const params = useParams();
  const id = params?.id;
  const dispatch = useDispatch();
  const { currentVideo, relatedVideos, loading } = useSelector((state: RootState) => state.videos);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchVideoById(id as string) as any);
      dispatch(fetchRelatedVideos(id as string) as any);
      dispatch(fetchComments({ videoId: id as string }) as any);
      
      // Add to watch history only if user is logged in
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        import('../../../services/videoService').then(({ videoService }) => {
          videoService.addToWatchHistory(id as string, 0).catch(console.error);
        });
      }
    }
  }, [id, dispatch]);

  if (loading || !currentVideo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex justify-center items-center h-64 pt-16">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex relative">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'ml-0'
        } lg:ml-64 pt-14 sm:pt-16 bg-gray-50 dark:bg-gray-900 overflow-x-hidden`}>
          <div className="w-full max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-2 sm:p-4">
              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Video player */}
                <div className="bg-black rounded-lg overflow-hidden mb-4">
                  <VideoPlayer video={currentVideo} />
                </div>

                {/* Video info */}
                <VideoInfo video={currentVideo} />

                {/* Video description */}
                <VideoDescription video={currentVideo} />

                {/* Comments section */}
                <div className="mt-6">
                  <CommentSection videoId={currentVideo._id} />
                </div>
              </div>

              {/* Sidebar with related videos */}
              <div className="w-full lg:w-80 xl:w-96">
                <RelatedVideos videos={relatedVideos} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}