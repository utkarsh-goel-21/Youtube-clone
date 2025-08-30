'use client';

import { useSelector } from 'react-redux';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RootState } from '../../store/store';
import {
  Home,
  TrendingUp,
  Users,
  Music,
  Gamepad2,
  Trophy,
  Newspaper,
  Monitor,
  Lightbulb,
  History,
  PlaySquare,
  Clock,
  Heart,
  Settings,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  const mainItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: TrendingUp, label: 'Trending', href: '/trending' },
    { icon: Users, label: 'Subscriptions', href: '/subscriptions', requireAuth: true },
  ];

  const libraryItems = [
    { icon: History, label: 'History', href: '/history' },
    { icon: PlaySquare, label: 'Your videos', href: '/studio' },
    { icon: Clock, label: 'Watch later', href: '/watch-later' },
    { icon: Heart, label: 'Liked videos', href: '/liked' },
  ];

  const exploreItems = [
    { icon: TrendingUp, label: 'Trending', href: '/trending' },
    { icon: Music, label: 'Music', href: '/?category=Music' },
    { icon: Gamepad2, label: 'Gaming', href: '/?category=Gaming' },
    { icon: Trophy, label: 'Sports', href: '/?category=Sports' },
    { icon: Newspaper, label: 'News', href: '/?category=News' },
    { icon: Monitor, label: 'Technology', href: '/?category=Technology' },
    { icon: Lightbulb, label: 'Learning', href: '/?category=Education' },
  ];

  const settingsItems = [
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href) || false;
  };

  const SidebarItem = ({ item, onClick }: { item: any; onClick?: () => void }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    
    if (item.requireAuth && !isAuthenticated) {
      return null;
    }

    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
          active
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <Icon size={20} className={active ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'} />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Mobile close button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
        <h2 className="text-lg font-semibold dark:text-white">Menu</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Main navigation */}
        <div className="p-4 space-y-1">
          {mainItems.map((item, index) => (
            <SidebarItem key={index} item={item} onClick={onClose} />
          ))}
        </div>

        {/* Library section - only show if authenticated */}
        {isAuthenticated && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700 mx-4"></div>
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 px-4">Library</h3>
              <div className="space-y-1">
                {libraryItems.map((item, index) => (
                  <SidebarItem key={index} item={item} onClick={onClose} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Explore section */}
        <div className="border-t border-gray-200 mx-4"></div>
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 px-4">Explore</h3>
          <div className="space-y-1">
            {exploreItems.map((item, index) => (
              <SidebarItem key={index} item={item} onClick={onClose} />
            ))}
          </div>
        </div>

        {/* Settings section */}
        {isAuthenticated && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700 mx-4"></div>
            <div className="p-4">
              <div className="space-y-1">
                {settingsItems.map((item, index) => (
                  <SidebarItem key={index} item={item} onClick={onClose} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Sign in prompt for unauthenticated users */}
        {!isAuthenticated && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700 mx-4"></div>
            <div className="p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Sign in to like videos, comment, and subscribe.
              </div>
              <Link
                href="/auth/login"
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </>
        )}

        {/* Footer info */}
        <div className="border-t border-gray-200 dark:border-gray-700 mx-4 mt-auto"></div>
        <div className="p-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="mb-2">
            © 2025 YouTube Clone Demo
          </div>
          <div>
            Built with Next.js, TypeScript, and Tailwind CSS
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed left-0 top-16 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}