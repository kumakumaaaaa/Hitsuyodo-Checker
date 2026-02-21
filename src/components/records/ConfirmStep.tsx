'use client';

import { useState } from 'react';
import { FileText, Calendar, Building2, Check, Loader2 } from 'lucide-react';
import type { UploadedFile, EvaluationMethod, WardSetting } from './SetupStep';

interface ConfirmStepProps {
  evaluationMethod: EvaluationMethod;
  hFile: UploadedFile | null;
  efFile: UploadedFile | null;
  title: string;
  periodFrom: string;
  periodTo: string;
  wards: WardSetting[];
  onBack: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmStep({
  evaluationMethod,
  hFile,
  efFile,
  title,
  periodFrom,
  periodTo,
  wards,
  onBack,
  onConfirm,
}: ConfirmStepProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  async function handleConfirm() {
    setIsProcessing(true);
    try {
      await onConfirm();
      setIsComplete(true);
    } catch (error) {
      console.error('レコード生成に失敗しました:', error);
      setIsProcessing(false);
    }
  }

  if (isProcessing) {
    return (
      <div className="mx-auto max-w-2xl animate-slide-up flex flex-col items-center justify-center py-20">
        {isComplete ? (
          <>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
              <Check size={32} className="text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              レコードを生成しました
            </h3>
            <p className="text-sm text-text-secondary">
              ホーム画面に戻ります...
            </p>
          </>
        ) : (
          <>
            <Loader2 size={40} className="animate-spin text-accent mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              レコードを生成中...
            </h3>
            <p className="text-sm text-text-secondary">
              データを処理しています。しばらくお待ちください
            </p>
          </>
        )}
      </div>
    );
  }

  const evaluationLabel = evaluationMethod === 'necessity_1' ? '看護必要度 Ⅰ' : '看護必要度 Ⅱ';

  return (
    <div className="mx-auto max-w-2xl animate-slide-up">
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {/* セクション: 基本情報 */}
        <div className="border-b border-border p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">基本情報</h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">タイトル</span>
              <span className="text-sm font-medium text-text-primary">{title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">評価方式</span>
              <span className="text-sm font-medium text-accent">{evaluationLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted flex items-center gap-1">
                <Calendar size={13} />
                対象期間
              </span>
              <span className="text-sm font-medium text-text-primary">
                {periodFrom} 〜 {periodTo}
              </span>
            </div>
          </div>
        </div>

        {/* セクション: ファイル */}
        <div className="border-b border-border p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
            <FileText size={14} className="text-text-muted" />
            取込ファイル
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Hファイル', file: hFile },
              { label: 'EFファイル', file: efFile },
            ].map(({ label, file }) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                <span className="text-xs text-text-muted">{label}</span>
                <span className="text-sm text-text-primary">{file?.name ?? '-'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* セクション: 病棟設定 */}
        <div className="p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
            <Building2 size={14} className="text-text-muted" />
            病棟設定（{wards.length} 件）
          </h3>
          <div className="space-y-1.5">
            {wards.map((ward, i) => (
              <div key={ward.id} className="flex items-center gap-3 rounded-lg bg-background px-3 py-2 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold bg-accent/10 text-accent">
                  {i + 1}
                </span>
                <span className="text-text-muted w-16">{ward.wardCode || '-'}</span>
                <span className="text-text-primary flex-1">{ward.wardName || '-'}</span>
                <span className="text-xs text-text-muted">
                  必要度{ward.nursingNeedType === 1 ? 'Ⅰ' : 'Ⅱ'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          戻る
        </button>
        <button
          onClick={handleConfirm}
          className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-xl active:scale-95"
        >
          レコードを生成する
        </button>
      </div>
    </div>
  );
}
