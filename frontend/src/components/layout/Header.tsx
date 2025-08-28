'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import Image from 'next/image';
import { RootState } from '../../store/store';
import { logout, getCurrentUser } from '../../store/slices/authSlice';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import NotificationCenter from '../notification/NotificationCenter';
import { Menu, Upload, Bell, User, LogIn } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Check if user is authenticated on component mount
    if (localStorage.getItem('token') && !user) {
      dispatch(getCurrentUser() as any);
    }
  }, [dispatch, user]);

  const handleLogout = () => {
    dispatch(logout());
    setShowUserMenu(false);
    router.push('/');
  };

  const handleUpload = () => {
    if (isAuthenticated) {
      router.push('/upload');
    } else {
      router.push('/auth/login?redirect=/upload');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-2 h-16">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden text-gray-700 dark:text-gray-300"
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
          
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">YT</span>
            </div>
            <span className="font-bold text-xl hidden sm:block dark:text-white">YouTube Clone</span>
          </Link>
        </div>

        {/* Center section */}
        <div className="flex-1 max-w-2xl mx-4">
          <SearchBar />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpload}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 hidden sm:flex text-gray-700 dark:text-gray-300"
            aria-label="Upload video"
            title="Upload video"
          >
            <Upload size={24} />
          </button>

          {isAuthenticated && (
            <NotificationCenter />
          )}

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="User menu"
              >
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.channelName}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User size={20} />
                  </div>
                )}
              </button>

              {showUserMenu && (
                <UserMenu
                  user={user}
                  onClose={() => setShowUserMenu(false)}
                  onLogout={handleLogout}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-full hover:bg-blue-50 transition-colors"
              >
                <LogIn size={16} />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}