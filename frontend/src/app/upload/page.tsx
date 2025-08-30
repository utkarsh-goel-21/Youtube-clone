'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { addVideo, setVideos } from '../../store/slices/videoSlice';
import { uploadApi } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { 
  Upload, 
  X, 
  FileVideo, 
  Image as ImageIcon, 
  AlertCircle,
  CheckCircle,
  Film,
  Tag,
  Globe,
  Lock
} from 'lucide-react';

const categories = [
  'Music', 'Gaming', 'Education', 'Entertainment', 
  'Sports', 'News', 'Technology', 'Comedy', 'Film', 'Howto', 'Other'
];

export default function UploadPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Other',
    tags: '',
    isPublic: true
  });
  
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/upload');
    }
  }, [isAuthenticated, router]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid video file (MP4, WebM, OGG, or MOV)');
        return;
      }
      
      // Validate file size (500MB limit)
      if (file.size > 500 * 1024 * 1024) {
        setError('Video file must be less than 500MB');
        return;
      }
      
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setError('');
      
      // Auto-fill title from filename if empty
      if (!formData.title) {
        const titleFromFile = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setFormData(prev => ({ ...prev, title: titleFromFile }));
      }
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, or WebP)');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Thumbnail must be less than 5MB');
        return;
      }
      
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!videoFile) {
      errors.video = 'Please select a video file';
    }
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }
    
    if (formData.description.length > 5000) {
      errors.description = 'Description must be less than 5000 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsUploading(true);
    setUploadStatus('uploading');
    setError('');
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('video', videoFile!);
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('category', formData.category);
      formDataToSend.append('isPublic', formData.isPublic.toString());
      
      // Convert tags string to array
      if (formData.tags) {
        const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        tagsArray.forEach(tag => formDataToSend.append('tags[]', tag));
      }
      
      if (thumbnailFile) {
        formDataToSend.append('thumbnail', thumbnailFile);
      }
      
      setUploadStatus('processing');
      
      const response = await uploadApi.post('/videos/upload', formDataToSend, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
        }
      });
      
      setUploadStatus('success');
      
      // Add the video to Redux state immediately so it appears on homepage
      dispatch(addVideo(response.data.video));
      
      // Force refresh all video lists to show the new video
      dispatch(setVideos([])); // Clear cached videos
      
      // Redirect to homepage to see the new video immediately
      setTimeout(() => {
        router.push('/'); // Go to homepage instead of watch page
        router.refresh(); // Force refresh the page
      }, 1500);
      
    } catch (error: any) {
      setUploadStatus('error');
      setError(error.message || 'Failed to upload video');
      setIsUploading(false);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview('');
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview('');
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Upload Video</h1>
        
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        {uploadStatus === 'success' && (
          <div className="mb-6 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg flex items-start">
            <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>Video uploaded successfully! Redirecting...</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video Upload Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FileVideo className="h-5 w-5 mr-2" />
              Video File
            </h2>
            
            {!videoFile ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                  id="video-upload"
                />
                <label htmlFor="video-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Click to upload video
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    MP4, WebM, OGG or MOV (max 500MB)
                  </p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <video
                  src={videoPreview}
                  controls
                  className="w-full rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeVideo}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  <X className="h-5 w-5" />
                </button>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              </div>
            )}
            {validationErrors.video && (
              <p className="mt-2 text-sm text-red-600">{validationErrors.video}</p>
            )}
          </div>
          
          {/* Video Details Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Video Details</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border ${
                    validationErrors.title ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500`}
                  placeholder="Enter video title"
                  maxLength={100}
                />
                <div className="mt-1 flex justify-between">
                  <div>
                    {validationErrors.title && (
                      <p className="text-sm text-red-600">{validationErrors.title}</p>
                    )}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formData.title.length}/100
                  </span>
                </div>
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={5}
                  className={`w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border ${
                    validationErrors.description ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-y`}
                  placeholder="Tell viewers about your video"
                  maxLength={5000}
                />
                <div className="mt-1 flex justify-between">
                  <div>
                    {validationErrors.description && (
                      <p className="text-sm text-red-600">{validationErrors.description}</p>
                    )}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formData.description.length}/5000
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Film className="inline h-4 w-4 mr-1" />
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Tag className="inline h-4 w-4 mr-1" />
                    Tags
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter tags separated by commas"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Thumbnail Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ImageIcon className="h-5 w-5 mr-2" />
              Thumbnail (Optional)
            </h2>
            
            {!thumbnailFile ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailSelect}
                  className="hidden"
                  id="thumbnail-upload"
                />
                <label htmlFor="thumbnail-upload" className="cursor-pointer">
                  <ImageIcon className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Click to upload thumbnail
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    JPEG, PNG or WebP (max 5MB)
                  </p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="w-full max-w-md mx-auto rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeThumbnail}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
          
          {/* Visibility Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Visibility</h2>
            
            <div className="space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="isPublic"
                  value="true"
                  checked={formData.isPublic === true}
                  onChange={() => setFormData(prev => ({ ...prev, isPublic: true }))}
                  className="mr-3"
                />
                <Globe className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Public</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Everyone can watch your video</p>
                </div>
              </label>
              
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="isPublic"
                  value="false"
                  checked={formData.isPublic === false}
                  onChange={() => setFormData(prev => ({ ...prev, isPublic: false }))}
                  className="mr-3"
                />
                <Lock className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Private</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Only you can watch your video</p>
                </div>
              </label>
            </div>
          </div>
          
          {/* Upload Progress */}
          {isUploading && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Processing...'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !videoFile}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isUploading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Processing...'}
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Video
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}