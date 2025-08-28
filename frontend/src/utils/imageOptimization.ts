// Image optimization utility for CDN and responsive images

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  blur?: number;
}

class ImageOptimizer {
  private cdnBaseUrl: string;
  private localBaseUrl: string;

  constructor() {
    // In production, this would be your CDN URL
    this.cdnBaseUrl = process.env.NEXT_PUBLIC_CDN_URL || '';
    this.localBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
  }

  /**
   * Optimize image URL with CDN parameters
   */
  optimize(originalUrl: string, options: ImageOptimizationOptions = {}): string {
    if (!originalUrl) return '';

    // If CDN is configured, use it
    if (this.cdnBaseUrl) {
      return this.buildCdnUrl(originalUrl, options);
    }

    // For local development, add optimization params
    return this.buildLocalUrl(originalUrl, options);
  }

  /**
   * Build CDN URL with optimization parameters
   * Example: https://cdn.example.com/image.jpg?w=800&q=80&f=webp
   */
  private buildCdnUrl(url: string, options: ImageOptimizationOptions): string {
    const params = new URLSearchParams();

    if (options.width) params.append('w', options.width.toString());
    if (options.height) params.append('h', options.height.toString());
    if (options.quality) params.append('q', options.quality.toString());
    if (options.format) params.append('f', options.format);
    if (options.fit) params.append('fit', options.fit);
    if (options.blur) params.append('blur', options.blur.toString());

    // Convert local URL to CDN URL
    const cdnUrl = url.replace(this.localBaseUrl, this.cdnBaseUrl);
    const separator = cdnUrl.includes('?') ? '&' : '?';
    
    return `${cdnUrl}${separator}${params.toString()}`;
  }

  /**
   * Build local URL with optimization hints
   */
  private buildLocalUrl(url: string, options: ImageOptimizationOptions): string {
    // For local development, just return the original URL
    // In production, you might have a local image processing service
    return url;
  }

  /**
   * Generate srcset for responsive images
   */
  generateSrcSet(url: string, widths: number[] = [320, 640, 1024, 1920]): string {
    return widths
      .map(width => `${this.optimize(url, { width, format: 'webp' })} ${width}w`)
      .join(', ');
  }

  /**
   * Get optimized thumbnail URL
   */
  getThumbnail(url: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    const sizes = {
      small: { width: 120, height: 90, quality: 70 },
      medium: { width: 320, height: 180, quality: 80 },
      large: { width: 640, height: 360, quality: 85 }
    };

    return this.optimize(url, sizes[size]);
  }

  /**
   * Get avatar URL with optimization
   */
  getAvatar(url: string, size: number = 48): string {
    return this.optimize(url, {
      width: size,
      height: size,
      quality: 90,
      fit: 'cover',
      format: 'webp'
    });
  }

  /**
   * Preload critical images
   */
  preloadImage(url: string, options?: ImageOptimizationOptions): void {
    const optimizedUrl = this.optimize(url, options);
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = optimizedUrl;
    
    if (options?.format) {
      link.type = `image/${options.format}`;
    }
    
    document.head.appendChild(link);
  }

  /**
   * Lazy load placeholder with blur
   */
  getPlaceholder(url: string): string {
    return this.optimize(url, {
      width: 20,
      quality: 10,
      blur: 10,
      format: 'webp'
    });
  }
}

// Export singleton instance
export const imageOptimizer = new ImageOptimizer();

// Export utility functions for convenience
export const optimizeImage = (url: string, options?: ImageOptimizationOptions) => 
  imageOptimizer.optimize(url, options);

export const getThumbnail = (url: string, size?: 'small' | 'medium' | 'large') => 
  imageOptimizer.getThumbnail(url, size);

export const getAvatar = (url: string, size?: number) => 
  imageOptimizer.getAvatar(url, size);

export const generateSrcSet = (url: string, widths?: number[]) => 
  imageOptimizer.generateSrcSet(url, widths);

export const preloadImage = (url: string, options?: ImageOptimizationOptions) => 
  imageOptimizer.preloadImage(url, options);

export const getPlaceholder = (url: string) => 
  imageOptimizer.getPlaceholder(url);