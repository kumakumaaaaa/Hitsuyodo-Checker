'use client';

import { useState } from 'react';
import { Building2, Plus, Trash2, FileText, Calendar, Check, Loader2 } from 'lucide-react';
import type { UploadedFile, EvaluationMethod, WardSetting } from './SetupStep';

/* ===== Step 2: 病棟設定 & 確認・生成 ===== */
interface WardConfirmStepProps {
  evaluationMethod: EvaluationMethod;
  hFile: UploadedFile | null;
  efFile: UploadedFile | null;
  title: string;
  periodFrom: string;
  periodTo: string;
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
  wards,
  onWardsChange,
  onBack,
  onConfirm,
}: WardConfirmStepProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const evaluationLabel = evaluationMethod === 'necessity_1' ? '看護必要度 Ⅰ' : '看護必要度 Ⅱ';
  const canGenerate = wards.length > 0 && wards.every((w) => w.wardCode.trim() !== '');

  function addWard() {
    onWardsChange([
      ...wards,
      {
        id: crypto.randomUUID(),
        wardCode: '',
        wardName: '',
        nursingNeedType: evaluationMethod === 'necessity_1' ? 1 : 2,
      },
    ]);
  }

  function updateWard(id: string, field: keyof WardSetting, value: string | number) {
    onWardsChange(wards.map((w) => (w.id === id ? { ...w, [field]: value } : w)));
  }

  function removeWard(id: string) {
    onWardsChange(wards.filter((w) => w.id !== id));
  }

  async function handleConfirm() {
    setIsProcessing(true);
    try {
      await onConfirm();
      setIsComplete(true);
    } catch {
      setIsProcessing(false);
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
            <p className="text-sm text-text-secondary">ホーム画面に戻ります...</p>
          </>
        ) : (
          <>
            <Loader2 size={40} className="animate-spin text-accent mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">レコードを生成中...</h3>
            <p className="text-sm text-text-secondary">しばらくお待ちください</p>
          </>
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
          <button onClick={addWard} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/8">
            <Plus size={13} /> 追加
          </button>
        </div>

        <div className="p-5">
          {wards.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border py-8 text-center">
              <Building2 size={24} className="text-text-muted/40 mb-1.5" />
              <p className="text-sm text-text-muted">「追加」ボタンから病棟を登録してください</p>
              <p className="text-xs text-text-muted mt-1">Hファイルから抽出した病棟コードを設定します</p>
            </div>
          ) : (
            <div className="space-y-2">
              {wards.map((ward, i) => (
                <div key={ward.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-xs font-bold text-accent">{i + 1}</span>
                    <div className="flex-1 grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="mb-0.5 block text-[11px] font-medium text-text-muted">病棟コード</label>
                        <input
                          type="text" value={ward.wardCode}
                          onChange={(e) => updateWard(ward.id, 'wardCode', e.target.value)}
                          placeholder="W001"
                          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] font-medium text-text-muted">病棟名称</label>
                        <input
                          type="text" value={ward.wardName}
                          onChange={(e) => updateWard(ward.id, 'wardName', e.target.value)}
                          placeholder="3階東病棟"
                          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] font-medium text-text-muted">必要度</label>
                        <select
                          value={ward.nursingNeedType}
                          onChange={(e) => updateWard(ward.id, 'nursingNeedType', parseInt(e.target.value))}
                          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                        >
                          <option value={1}>Ⅰ</option>
                          <option value={2}>Ⅱ</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={() => removeWard(ward.id)} className="mt-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
