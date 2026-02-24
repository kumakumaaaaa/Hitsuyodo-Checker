'use client';

import { useState } from 'react';
import { Building2, FileText, Calendar, Check, Loader2, ChevronDown } from 'lucide-react';
import type { UploadedFile, EvaluationMethod, WardSetting } from './SetupStep';
import {
  ADMISSION_TYPES,
  getAdmissionType,
  getCriteriaByAdmissionType,
  getJudgmentPattern,
  getAdmissionTypesByCategory,
} from '@/lib/master-data/admission-type-data';
import { getWardDefaults, saveWardDefaults, type WardDefault } from '@/lib/settings/ward-defaults';

/* ===== Step 2: 病棟設定 & 確認・生成 ===== */
interface WardConfirmStepProps {
  evaluationMethod: EvaluationMethod;
  hFile: UploadedFile | null;
  efFile: UploadedFile | null;
  title: string;
  periodFrom: string;
  periodTo: string;
  extractedWardCodes: string[];
  wards: WardSetting[];
  onWardsChange: (w: WardSetting[]) => void;
  onBack: () => void;
  onConfirm: () => Promise<void>;
}

export function WardConfirmStep({
  evaluationMethod,
  hFile,
  efFile,
  title,
  periodFrom,
  periodTo,
  extractedWardCodes,
  wards,
  onWardsChange,
  onBack,
  onConfirm,
}: WardConfirmStepProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

  const evaluationLabel = evaluationMethod === 'necessity_1' ? '看護必要度 Ⅰ' : '看護必要度 Ⅱ';
  const allWardsNamed = wards.every((w) => w.wardName.trim().length > 0);
  const allWardsHaveAdmission = wards.every((w) => w.admissionTypeId !== null);
  const canGenerate = wards.length > 0 && allWardsNamed && allWardsHaveAdmission;

  const groupedAdmissionTypes = getAdmissionTypesByCategory();

  function updateWard(wardCode: string, updates: Partial<WardSetting>) {
    onWardsChange(wards.map((w) => (w.wardCode === wardCode ? { ...w, ...updates } : w)));
  }

  /** デフォルト設定に保存（既存設定とマージ、病棟コード重複なし） */
  function saveWardsAsDefaults() {
    const existing = getWardDefaults();
    const existingMap = new Map(existing.map((d) => [d.wardCode, d]));
    // 現在の病棟設定で上書き（マージ）
    for (const ward of wards) {
      existingMap.set(ward.wardCode, {
        wardCode: ward.wardCode,
        wardName: ward.wardName,
        admissionTypeId: ward.admissionTypeId,
      });
    }
    saveWardDefaults(Array.from(existingMap.values()));
  }

  async function handleConfirm() {
    setIsProcessing(true);
    setProgressStep(1); // バリデーション開始

    try {
      if (saveAsDefault) {
        saveWardsAsDefaults();
      }

      // 擬似的なステップ進行: 保存中
      setTimeout(() => setProgressStep(2), 800);
      
      await onConfirm();
      
      // 擬似的なステップ進行: 演算中〜完了
      setProgressStep(3);
      setTimeout(() => {
        setIsComplete(true);
      }, 1000);
    } catch (error: any) {
      console.error(error);
      alert('エラーが発生しました: ' + (error.message || '不明なエラー'));
      setIsProcessing(false);
      setProgressStep(0);
    }
  }

  // 処理中/完了画面
  if (isProcessing) {
    return (
      <div className="mx-auto max-w-2xl animate-slide-up flex flex-col items-center justify-center py-20">
        {isComplete ? (
          <>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
              <Check size={32} className="text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">レコードを生成しました</h3>
            <p className="text-sm text-text-secondary">レコード詳細画面へ移動します...</p>
          </>
        ) : (
          <div className="w-full max-w-md space-y-6">
            <div className="flex flex-col items-center justify-center text-center">
              <Loader2 size={40} className="animate-spin text-accent mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">レコードを生成中...</h3>
              <p className="text-sm text-text-secondary">ファイルの検証・データの演算を行っています。<br />画面を閉じずにしばらくお待ちください。</p>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-text-primary">処理状況</span>
                  <span className="text-accent">
                    {progressStep === 1 && '1/3 バリデーション確認中...'}
                    {progressStep === 2 && '2/3 データ保存中...'}
                    {progressStep === 3 && '3/3 評価基準を演算中...'}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-background relative">
                  <div className="absolute left-0 top-0 h-full w-[100%] animate-loading-bar bg-accent"></div>
                </div>
              </div>
              
              <div className="mt-4 space-y-2 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  {progressStep > 1 ? <Check size={14} className="text-accent" /> : <Loader2 size={14} className="animate-spin text-accent" />}
                  <span className={progressStep >= 1 ? 'text-text-primary font-medium' : 'text-text-muted'}>
                    ファイル・設定のバリデーション
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {progressStep > 2 ? <Check size={14} className="text-accent" /> : progressStep === 2 ? <Loader2 size={14} className="animate-spin text-accent" /> : <div className="h-3.5 w-3.5 rounded-full border border-border" />}
                  <span className={progressStep >= 2 ? 'text-text-primary font-medium' : 'text-text-muted'}>
                    レコードと病棟設定の保存
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {progressStep > 3 ? <Check size={14} className="text-accent" /> : progressStep === 3 ? <Loader2 size={14} className="animate-spin text-accent" /> : <div className="h-3.5 w-3.5 rounded-full border border-border" />}
                  <span className={progressStep >= 3 ? 'text-text-primary font-medium' : 'text-text-muted'}>
                    評価基準の初回演算
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-slide-up space-y-6">

      {/* ── Step 1 サマリー ── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border px-5 py-3 bg-background">
          <h3 className="text-sm font-semibold text-text-primary">基本設定（Step 1）</h3>
        </div>
        <div className="p-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">タイトル</span>
            <span className="font-medium text-text-primary">{title}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">評価方式</span>
            <span className="font-medium text-accent">{evaluationLabel}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted flex items-center gap-1"><Calendar size={12} />対象期間</span>
            <span className="font-medium text-text-primary">{periodFrom} 〜 {periodTo}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted flex items-center gap-1"><FileText size={12} />Hファイル</span>
            <span className="text-text-primary">{hFile?.name ?? '-'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted flex items-center gap-1"><FileText size={12} />EFファイル</span>
            <span className="text-text-primary">{efFile?.name ?? '-'}</span>
          </div>
        </div>
      </div>

      {/* ── 病棟設定 ── */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3 bg-background">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <Building2 size={14} className="text-text-muted" />
            病棟設定
          </h3>
          <span className="text-xs text-text-muted">{extractedWardCodes.length} 病棟検出</span>
        </div>

        <div className="p-5">
          {extractedWardCodes.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border py-8 text-center">
              <Building2 size={24} className="text-text-muted/40 mb-1.5" />
              <p className="text-sm text-text-muted">ファイルから病棟コードが検出されませんでした</p>
              <p className="text-xs text-text-muted mt-1">H/EFファイルに病棟コードが含まれているか確認してください</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-text-muted mb-3">
                H/EFファイルから検出された病棟コードです。各病棟に入院料を設定してください。
              </p>
              {wards.map((ward, i) => {
                const selectedType = ward.admissionTypeId ? getAdmissionType(ward.admissionTypeId) : null;
                const criteria = ward.admissionTypeId ? getCriteriaByAdmissionType(ward.admissionTypeId) : [];

                return (
                  <div key={ward.wardCode} className="rounded-xl border border-border p-4 space-y-3">
                    {/* 1行目: 番号 + 病棟コード + 病棟名称 */}
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-xs font-bold text-accent">{i + 1}</span>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-0.5 block text-[11px] font-medium text-text-muted">病棟コード</label>
                          <div className="rounded-lg border border-border bg-background/50 px-2.5 py-1.5 text-sm font-mono text-text-primary">
                            {ward.wardCode}
                          </div>
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[11px] font-medium text-text-muted">病棟名称 <span className="text-red-400">*</span></label>
                          <input
                            type="text"
                            value={ward.wardName}
                            onChange={(e) => updateWard(ward.wardCode, { wardName: e.target.value })}
                            placeholder="例: 3階東病棟"
                            className={`w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none ${
                              ward.wardName.trim().length === 0
                                ? 'border-red-300 focus:border-red-400'
                                : 'border-border focus:border-accent'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2行目: 入院料選択 */}
                    <div className="ml-9">
                      <label className="mb-0.5 block text-[11px] font-medium text-text-muted">入院料 <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <select
                          value={ward.admissionTypeId ?? ''}
                          onChange={(e) => updateWard(ward.wardCode, {
                            admissionTypeId: e.target.value ? Number(e.target.value) : null,
                          })}
                          className={`w-full appearance-none rounded-lg border bg-background px-2.5 py-1.5 pr-8 text-sm text-text-primary focus:outline-none ${
                            ward.admissionTypeId === null
                              ? 'border-red-300 focus:border-red-400'
                              : 'border-border focus:border-accent'
                          }`}
                        >
                          <option value="">選択してください</option>
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
                        <div className="mt-1.5 space-y-0.5">
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
                      {selectedType && criteria.length === 0 && (
                        <p className="mt-1 text-[11px] text-text-muted">判定基準なし</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── デフォルト保存チェック ── */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={saveAsDefault}
          onChange={(e) => setSaveAsDefault(e.target.checked)}
          className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
        />
        <span className="text-sm text-text-secondary">この病棟設定をデフォルトとして保存する</span>
      </label>

      {/* ── ナビゲーション ── */}
      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          戻る
        </button>
        <button
          onClick={handleConfirm}
          disabled={!canGenerate}
          className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          レコードを生成する
        </button>
      </div>
    </div>
  );
}
