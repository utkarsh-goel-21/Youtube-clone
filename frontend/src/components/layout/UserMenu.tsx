'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  User as UserIcon, 
  Settings, 
  LogOut, 
  Upload, 
  History, 
  PlaySquare,
  Heart,
  Clock
} from 'lucide-react';
import type { User } from '../../types/user';

interface UserMenuProps {
  user: User | null;
  onClose: () => void;
  onLogout: () => void;
}

export default function UserMenu({ user, onClose, onLogout }: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!user) return null;

  const menuItems = [
    {
      icon: User,
      label: 'Your channel',
      href: `/channel/${user._id || user.id}`
    },
    {
      icon: Upload,
      label: 'Upload video',
      href: '/upload'
    },
    {
      icon: PlaySquare,
      label: 'Your videos',
      href: '/studio'
    },
    {
      icon: History,
      label: 'History',
      href: '/history'
    },
    {
      icon: Heart,
      label: 'Liked videos',
      href: '/liked'
    },
    {
      icon: Clock,
      label: 'Watch later',
      href: '/watch-later'
    },
    {
      icon: Settings,
      label: 'Settings',
      href: '/settings'
    }
  ];

  return (
    <div
      ref={menuRef}
      className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
    >
      {/* User Info */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.channelName}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <UserIcon size={24} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {user.channelName}
            </div>
            <div className="text-sm text-gray-500 truncate">
              {user.email}
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={index}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Icon size={20} className="text-gray-500" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      <div className="border-t border-gray-100 py-2">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-2 w-full text-left text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <LogOut size={20} className="text-gray-500" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}