'use client';

import { useState } from 'react';
import { X, Building2, ClipboardList } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'ward' | 'admission';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('ward');

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'ward', label: '病棟コードのデフォルト設定', icon: <Building2 size={18} /> },
    { id: 'admission', label: '入院料・加算マスタの編集', icon: <ClipboardList size={18} /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-modal-overlay animate-fade-in" />

      {/* モーダル本体 */}
      <div className="animate-scale-in relative w-full max-w-4xl rounded-2xl border border-border bg-surface shadow-2xl mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">設定</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        {/* サイドバー + コンテンツの横並びレイアウト */}
        <div className="flex min-h-[480px]">
          {/* サイドバー（タブ） */}
          <nav className="w-72 shrink-0 border-r border-border p-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-1 ${
                  activeTab === tab.id
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* コンテンツ */}
          <div className="flex-1 p-6">
            {activeTab === 'ward' && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Building2 size={40} className="text-text-muted/40 mb-3" />
                <p className="text-sm font-medium text-text-secondary">
                  病棟コードのデフォルト設定
                </p>
                <p className="text-xs text-text-muted mt-1">
                  フェーズ2で実装予定です
                </p>
              </div>
            )}
            {activeTab === 'admission' && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ClipboardList size={40} className="text-text-muted/40 mb-3" />
                <p className="text-sm font-medium text-text-secondary">
                  入院料・加算マスタの編集
                </p>
                <p className="text-xs text-text-muted mt-1">
                  フェーズ2で実装予定です
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
