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
    { id: 'ward', label: '病棟コードのデフォルト設定', icon: <Building2 size={16} /> },
    { id: 'admission', label: '入院料・加算マスタの編集', icon: <ClipboardList size={16} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-modal-overlay animate-fade-in" />

      {/* モーダル本体 */}
      <div className="animate-scale-in relative w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl mx-4">
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

        {/* タブ */}
        <div className="flex border-b border-border px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        <div className="p-6 min-h-[300px]">
          {activeTab === 'ward' && (
            <div className="flex flex-col items-center justify-center h-[260px] text-center">
              <Building2 size={40} className="text-text-muted mb-3" />
              <p className="text-sm text-text-secondary">
                病棟コードのデフォルト設定は
              </p>
              <p className="text-sm text-text-muted mt-1">
                フェーズ2で実装予定です
              </p>
            </div>
          )}
          {activeTab === 'admission' && (
            <div className="flex flex-col items-center justify-center h-[260px] text-center">
              <ClipboardList size={40} className="text-text-muted mb-3" />
              <p className="text-sm text-text-secondary">
                入院料・加算マスタの編集は
              </p>
              <p className="text-sm text-text-muted mt-1">
                フェーズ2で実装予定です
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
