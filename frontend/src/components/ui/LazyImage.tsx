import React, { useMemo } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { optimizeImage, getPlaceholder, generateSrcSet } from '../../utils/imageOptimization';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: string | number;
  height?: string | number;
  placeholderSrc?: string;
  effect?: 'blur' | 'opacity';
  threshold?: number;
  onLoad?: () => void;
  style?: React.CSSProperties;
  quality?: number;
  responsive?: boolean;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  placeholderSrc,
  effect = 'blur',
  threshold = 100,
  onLoad,
  style,
  quality = 85,
  responsive = false
}) => {
  // Optimize image URL
  const optimizedSrc = useMemo(() => 
    optimizeImage(src, {
      width: typeof width === 'number' ? width : undefined,
      height: typeof height === 'number' ? height : undefined,
      quality,
      format: 'webp'
    }), [src, width, height, quality]
  );
  
  // Generate placeholder
  const placeholder = useMemo(() => 
    placeholderSrc || getPlaceholder(src), 
    [placeholderSrc, src]
  );
  
  // Generate srcSet for responsive images
  const srcSet = useMemo(() => 
    responsive ? generateSrcSet(src) : undefined,
    [src, responsive]
  );
  
  return (
    <LazyLoadImage
      src={optimizedSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      placeholderSrc={placeholder}
      effect={effect}
      threshold={threshold}
      afterLoad={onLoad}
      style={style}
      wrapperClassName={className}
      srcSet={srcSet}
    />
  );
};

export default LazyImage;