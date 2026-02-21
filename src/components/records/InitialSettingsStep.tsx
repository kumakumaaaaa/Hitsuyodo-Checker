'use client';

import { useState } from 'react';
import { Calendar, Building2, Plus, Trash2 } from 'lucide-react';
import type { EvaluationMethod } from './FileUploadStep';

export interface WardSetting {
  id: string;
  wardCode: string;
  wardName: string;
  nursingNeedType: 1 | 2;
}

interface InitialSettingsStepProps {
  title: string;
  onTitleChange: (title: string) => void;
  periodFrom: string;
  onPeriodFromChange: (period: string) => void;
  periodTo: string;
  onPeriodToChange: (period: string) => void;
  wards: WardSetting[];
  onWardsChange: (wards: WardSetting[]) => void;
  evaluationMethod: EvaluationMethod;
  onBack: () => void;
  onNext: () => void;
}

export function InitialSettingsStep({
  title,
  onTitleChange,
  periodFrom,
  onPeriodFromChange,
  periodTo,
  onPeriodToChange,
  wards,
  onWardsChange,
  evaluationMethod,
  onBack,
  onNext,
}: InitialSettingsStepProps) {
  const canProceed = title.trim() !== '' && periodFrom !== '' && periodTo !== '' && wards.length > 0;

  function addWard() {
    const newWard: WardSetting = {
      id: crypto.randomUUID(),
      wardCode: '',
      wardName: '',
      nursingNeedType: evaluationMethod === 'necessity_1' ? 1 : 2,
    };
    onWardsChange([...wards, newWard]);
  }

  function updateWard(id: string, field: keyof WardSetting, value: string | number) {
    onWardsChange(
      wards.map((w) => (w.id === id ? { ...w, [field]: value } : w))
    );
  }

  function removeWard(id: string) {
    onWardsChange(wards.filter((w) => w.id !== id));
  }

  return (
    <div className="mx-auto max-w-2xl animate-slide-up">
      {/* タイトル */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-text-primary">
          レコードタイトル
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="例: 2025年10月分"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* 対象期間 */}
      <div className="mb-8">
        <label className="mb-2 block text-sm font-semibold text-text-primary">
          <Calendar size={14} className="inline mr-1.5 -mt-0.5 text-text-muted" />
          対象期間
        </label>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={periodFrom}
            onChange={(e) => onPeriodFromChange(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <span className="text-text-muted text-sm">〜</span>
          <input
            type="month"
            value={periodTo}
            onChange={(e) => onPeriodToChange(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      {/* 病棟設定 */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-semibold text-text-primary">
            <Building2 size={14} className="inline mr-1.5 -mt-0.5 text-text-muted" />
            病棟設定
          </label>
          <button
            onClick={addWard}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/8"
          >
            <Plus size={14} />
            病棟を追加
          </button>
        </div>

        {wards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
            <Building2 size={28} className="text-text-muted/40 mb-2" />
            <p className="text-sm text-text-muted">
              「病棟を追加」から病棟情報を登録してください
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {wards.map((ward, index) => (
              <div
                key={ward.id}
                className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-xs font-bold text-accent">
                    {index + 1}
                  </span>
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-text-muted">
                        病棟コード
                      </label>
                      <input
                        type="text"
                        value={ward.wardCode}
                        onChange={(e) => updateWard(ward.id, 'wardCode', e.target.value)}
                        placeholder="例: W001"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-text-muted">
                        病棟名称
                      </label>
                      <input
                        type="text"
                        value={ward.wardName}
                        onChange={(e) => updateWard(ward.id, 'wardName', e.target.value)}
                        placeholder="例: 3階東病棟"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-text-muted">
                        看護必要度
                      </label>
                      <select
                        value={ward.nursingNeedType}
                        onChange={(e) => updateWard(ward.id, 'nursingNeedType', parseInt(e.target.value))}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                      >
                        <option value={1}>必要度 Ⅰ</option>
                        <option value={2}>必要度 Ⅱ</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => removeWard(ward.id)}
                    className="mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ナビゲーション */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          戻る
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          次へ
        </button>
      </div>
    </div>
  );
}
