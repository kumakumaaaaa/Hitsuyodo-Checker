'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Settings, User, LogOut, ChevronDown } from 'lucide-react';
import { SettingsModal } from '../settings/SettingsModal';

export function Header() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setIsAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[rgb(60,60,60)] bg-header-bg shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* ロゴ */}
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="hidden text-sm font-semibold text-white sm:inline">
              看護必要度アナリシスソフト
            </span>
            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent hidden sm:inline">
              Beta
            </span>
          </Link>

          {/* 右側アクション */}
          <div className="flex items-center gap-1">
            {/* 設定アイコン */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              title="設定"
            >
              <Settings size={18} />
            </button>

            {/* アカウントアイコン */}
            <div ref={accountRef} className="relative">
              <button
                onClick={() => setIsAccountOpen(!isAccountOpen)}
                className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/25 text-xs font-bold text-accent">
                  G
                </div>
                <ChevronDown size={14} className={`transition-transform ${isAccountOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAccountOpen && (
                <div className="animate-scale-in absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-2xl">
                  <div className="border-b border-border-subtle px-3 py-2.5 mb-1">
                    <p className="text-sm font-medium text-text-primary">ゲスト</p>
                    <p className="text-xs text-text-muted">guest@example.com</p>
                  </div>
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary">
                    <User size={15} />
                    アカウント設定
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10">
                    <LogOut size={15} />
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 設定モーダル */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
