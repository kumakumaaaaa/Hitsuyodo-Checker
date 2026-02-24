'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Building2, Plus, Trash2, ChevronDown, Save } from 'lucide-react';
import { getWardDefaults, saveWardDefaults, type WardDefault } from '@/lib/settings/ward-defaults';
import {
  ADMISSION_TYPES,
  getAdmissionType,
  getCriteriaByAdmissionType,
  getJudgmentPattern,
  getAdmissionTypesByCategory,
} from '@/lib/master-data/admission-type-data';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ===== 病棟デフォルト設定タブ ===== */
function WardDefaultsTab() {
  const [defaults, setDefaults] = useState<WardDefault[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setDefaults(getWardDefaults());
  }, []);

  const groupedAdmissionTypes = getAdmissionTypesByCategory();

  const addRow = useCallback(() => {
    setDefaults((prev) => [
      ...prev,
      { wardCode: '', wardName: '', admissionTypeId: null },
    ]);
    setHasChanges(true);
  }, []);

  const updateRow = useCallback((index: number, updates: Partial<WardDefault>) => {
    setDefaults((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d))
    );
    setHasChanges(true);
  }, []);

  const removeRow = useCallback((index: number) => {
    setDefaults((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    // 空の病棟コード行は除外して保存
    const valid = defaults.filter((d) => d.wardCode.trim().length > 0);
    saveWardDefaults(valid);
    setDefaults(valid);
    setHasChanges(false);
  }, [defaults]);

  return (
    <div className="flex flex-col h-full">
      {/* 説明 */}
      <div className="mb-4 shrink-0">
        <h3 className="text-sm font-semibold text-text-primary mb-1">病棟コード・入院料デフォルト設定</h3>
        <p className="text-xs text-text-muted leading-relaxed">
          よく使う病棟コードに対して、デフォルトの病棟名称・入院料を設定できます。<br />
          新規レコード作成時、ファイルから検出された病棟コードにこのデフォルト値が自動的に適用されます。
        </p>
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
        {defaults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl">
            <Building2 size={28} className="text-text-muted/30 mb-2" />
            <p className="text-sm text-text-muted mb-3">デフォルト設定がありません</p>
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
            >
              <Plus size={14} /> 追加する
            </button>
          </div>
        ) : (
          defaults.map((d, i) => {
            const selectedType = d.admissionTypeId ? getAdmissionType(d.admissionTypeId) : null;
            const criteria = d.admissionTypeId ? getCriteriaByAdmissionType(d.admissionTypeId) : [];

            return (
              <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                {/* 1行目: 病棟コード + 名称 + 削除ボタン */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[11px] font-medium text-text-muted">病棟コード</label>
                      <input
                        type="text"
                        value={d.wardCode}
                        onChange={(e) => updateRow(i, { wardCode: e.target.value })}
                        placeholder="例: 001A"
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[11px] font-medium text-text-muted">病棟名称</label>
                      <input
                        type="text"
                        value={d.wardName}
                        onChange={(e) => updateRow(i, { wardName: e.target.value })}
                        placeholder="例: 3階東病棟"
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeRow(i)}
                    className="mt-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
                    title="削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* 2行目: 入院料選択 */}
                <div>
                  <label className="mb-0.5 block text-[11px] font-medium text-text-muted">デフォルト入院料</label>
                  <div className="relative">
                    <select
                      value={d.admissionTypeId ?? ''}
                      onChange={(e) =>
                        updateRow(i, {
                          admissionTypeId: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full appearance-none rounded-lg border border-border bg-background px-2.5 py-1.5 pr-8 text-sm text-text-primary focus:border-accent focus:outline-none"
                    >
                      <option value="">未設定</option>
                      {groupedAdmissionTypes.map((group) => (
                        <optgroup key={group.category} label={group.label}>
                          {group.types.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  </div>
                  {/* 判定パターン表示 */}
                  {selectedType && criteria.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {criteria.map((c) => {
                        const pattern = getJudgmentPattern(c.judgmentPatternId);
                        return (
                          <div key={c.id} className="flex items-center gap-1.5 text-[11px] text-text-muted">
                            <span className="rounded bg-accent/10 px-1.5 py-0.5 font-medium text-accent">{pattern?.code}</span>
                            <span>{c.criteriaNo}: {pattern?.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* フッター: 追加 + 保存 */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <Plus size={14} /> 行を追加
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={14} /> 保存する
        </button>
      </div>
    </div>
  );
}

/* ===== メインモーダル ===== */
type TabId = 'ward';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('ward');

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'ward', label: '病棟コード・入院料デフォルト設定', icon: <Building2 size={18} /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-modal-overlay animate-fade-in" />

      {/* モーダル本体 */}
      <div className="animate-scale-in relative w-full max-w-4xl rounded-2xl border border-border bg-surface shadow-2xl mx-4" style={{ maxHeight: '80vh' }}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-text-primary">設定</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>

        {/* サイドバー + コンテンツ */}
        <div className="flex" style={{ height: 'calc(80vh - 64px)' }}>
          {/* サイドバー */}
          <nav className="w-80 shrink-0 border-r border-border p-3 overflow-y-auto">
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
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'ward' && <WardDefaultsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

