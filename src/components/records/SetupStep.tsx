'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { extractDateRangeFromFile, validateDateRangeAgainstPeriod } from '@/lib/file-parser/validate-data-period';
import { validateEvaluationMethod } from '@/lib/file-parser/validate-evaluation-method';

/* ===== 型定義 ===== */
export type EvaluationMethod = 'necessity_1' | 'necessity_2';

export interface UploadedFile {
  file: File;
  name: string;
  size: string;
  lineCount: number | null;
}

export interface WardSetting {
  id: string;
  wardCode: string;
  wardName: string;
  admissionTypeId: number | null;
}

/* ===== ユーティリティ ===== */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function countLines(file: File): Promise<number> {
  const text = await file.text();
  return text.split('\n').filter((l) => l.trim().length > 0).length;
}

/* ===== バリデーション ===== */
const ALLOWED_EXTENSIONS = ['.txt', '.csv', '.tsv'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

function validateFile(file: File): FileValidationResult {
  // 拡張子チェック
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `対応していないファイル形式です（${ext}）。.txt, .csv, .tsv のみ対応しています` };
  }

  // サイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `ファイルサイズが大きすぎます（${formatFileSize(file.size)}）。100MB以下のファイルを選択してください` };
  }

  // 空ファイルチェック（0バイト）
  if (file.size === 0) {
    return { valid: false, error: 'ファイルが空です。データが含まれるファイルを選択してください' };
  }

  return { valid: true };
}

/* ===== ファイルドロップゾーン ===== */
function FileDropZone({
  label,
  file,
  onFileSelect,
  onRemove,
}: {
  label: string;
  file: UploadedFile | null;
  onFileSelect: (file: UploadedFile) => void;
  onRemove: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (f: File) => {
      setError(null);

      // バリデーション
      const validation = validateFile(f);
      if (!validation.valid) {
        setError(validation.error ?? 'ファイルの検証に失敗しました');
        return;
      }

      // 行数カウント
      const lines = await countLines(f);

      // 空ファイルチェック（内容あるが有効行0行）
      if (lines === 0) {
        setError('ファイルにデータ行がありません。有効なデータを含むファイルを選択してください');
        return;
      }

      onFileSelect({ file: f, name: f.name, size: formatFileSize(f.size), lineCount: lines });
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setError(null);
    onRemove();
  }, [onRemove]);

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <FileText size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
          <p className="text-xs text-text-muted">{file.size} · {file.lineCount?.toLocaleString() ?? '-'} 行</p>
        </div>
        <button
          onClick={handleRemove}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover hover:text-danger"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div 
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(e); }}
    >
      <div
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
          error
            ? 'border-danger/50 bg-danger/5'
            : isDragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-surface-hover'
        }`}
      >
        <input
          type="file"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          accept=".txt,.csv,.tsv"
        />
        <Upload size={20} className={`mb-1.5 ${error ? 'text-danger' : isDragging ? 'text-accent' : 'text-text-muted'}`} />
        <p className={`text-sm ${error ? 'text-danger' : 'text-text-secondary'}`}>{label}</p>
        <p className="text-[11px] text-text-muted mt-0.5">ドラッグ＆ドロップ または クリック</p>
        <p className="text-[11px] text-text-muted">.txt / .csv / .tsv（100MB以下）</p>
      </div>
      {error && (
        <p className="mt-1.5 flex items-start gap-1 text-xs text-danger">
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ===== Step 1: 基本設定 ===== */
interface SetupStepProps {
  evaluationMethod: EvaluationMethod;
  onEvaluationMethodChange: (m: EvaluationMethod) => void;
  hFile: UploadedFile | null;
  efFile: UploadedFile | null;
  onHFileChange: (f: UploadedFile | null) => void;
  onEfFileChange: (f: UploadedFile | null) => void;
  title: string;
  onTitleChange: (t: string) => void;
  periodFrom: string;
  onPeriodFromChange: (p: string) => void;
  periodTo: string;
  onPeriodToChange: (p: string) => void;
  onNext: () => void;
}

export function SetupStep({
  evaluationMethod, onEvaluationMethodChange,
  hFile, efFile, onHFileChange, onEfFileChange,
  title, onTitleChange,
  periodFrom, onPeriodFromChange,
  periodTo, onPeriodToChange,
  onNext,
}: SetupStepProps) {
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [dataPeriodError, setDataPeriodError] = useState<string | null>(null);
  const [isValidatingFiles, setIsValidatingFiles] = useState(false);

  // 対象期間のバリデーション
  const validatePeriod = useCallback((from: string, to: string) => {
    if (!from || !to) {
      setPeriodError(null);
      return false;
    }

    const fromDate = new Date(`${from}-01`);
    const MathToDate = new Date(`${to}-01`);

    if (fromDate > MathToDate) {
      setPeriodError('終了月は開始月以降を指定してください');
      return false;
    }

    // 期間の月数計算: (年差 * 12) + 月差 + 1 (開始月を含むため)
    const monthsDiff = (MathToDate.getFullYear() - fromDate.getFullYear()) * 12 + (MathToDate.getMonth() - fromDate.getMonth()) + 1;
    if (monthsDiff > 3) {
      setPeriodError('集計対象期間は最大3ヶ月以内までとしてください');
      return false;
    }

    setPeriodError(null);
    setDataPeriodError(null); // 対象期間が変わったらデータエラーもリセット
    return true;
  }, []);

  const handlePeriodFromChange = (p: string) => {
    onPeriodFromChange(p);
    validatePeriod(p, periodTo);
  };

  const handlePeriodToChange = (p: string) => {
    onPeriodToChange(p);
    validatePeriod(periodFrom, p);
  };

  const handleNextClick = async () => {
    if (!hFile || !efFile || !periodFrom || !periodTo) return;
    
    setIsValidatingFiles(true);
    setDataPeriodError(null);

    try {
      // 評価方式とHファイル内容の整合性検証
      const evalMethodRes = await validateEvaluationMethod(hFile.file, evaluationMethod);
      if (!evalMethodRes.isValid) {
        setDataPeriodError(evalMethodRes.error || '不明なエラー');
        return;
      }

      // Hファイルのデータ期間検証
      const hDateRange = await extractDateRangeFromFile(hFile.file, 'H');
      const hValRes = validateDateRangeAgainstPeriod(hDateRange, periodFrom, periodTo, 'Hファイル');
      if (!hValRes.isValid) {
        setDataPeriodError(hValRes.error || '不明なエラー');
        return;
      }

      // EFファイルのデータ期間検証
      const efDateRange = await extractDateRangeFromFile(efFile.file, 'EF');
      const efValRes = validateDateRangeAgainstPeriod(efDateRange, periodFrom, periodTo, 'EFファイル');
      if (!efValRes.isValid) {
        setDataPeriodError(efValRes.error || '不明なエラー');
        return;
      }

      // バリデーション成功、次へ
      onNext();
    } catch (e) {
      console.error(e);
      setDataPeriodError('ファイルの読み込み中にエラーが発生しました');
    } finally {
      setIsValidatingFiles(false);
    }
  };

  const isPeriodValid = periodFrom && periodTo && !periodError;

  const canProceed =
    hFile !== null &&
    efFile !== null &&
    title.trim() !== '' &&
    isPeriodValid;

  return (
    <div className="mx-auto max-w-2xl animate-slide-up space-y-7">

      {/* 評価方式 */}
      <section>
        <label className="mb-2 block text-sm font-semibold text-text-primary">評価方式</label>
        <div className="flex gap-3">
          {([
            { value: 'necessity_1' as const, label: '看護必要度 Ⅰ' },
            { value: 'necessity_2' as const, label: '看護必要度 Ⅱ' },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onEvaluationMethodChange(opt.value)}
              className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                evaluationMethod === opt.value
                  ? 'border-accent bg-accent/8 text-accent'
                  : 'border-border text-text-secondary hover:border-accent/30'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  evaluationMethod === opt.value ? 'border-accent' : 'border-text-muted'
                }`}>
                  {evaluationMethod === opt.value && <div className="h-2.5 w-2.5 rounded-full bg-accent" />}
                </div>
                {opt.label}
              </div>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-text-muted">
          <AlertCircle size={11} className="inline mr-1 -mt-0.5" />
          評価方式によって判定基準が異なります
        </p>
      </section>

      {/* タイトル */}
      <section>
        <label className="mb-2 block text-sm font-semibold text-text-primary">レコードタイトル</label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="例: 2025年10月分"
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </section>

      {/* 対象期間 */}
      <section>
        <label className="mb-2 block text-sm font-semibold text-text-primary">
          <Calendar size={13} className="inline mr-1.5 -mt-0.5 text-text-muted" />
          対象期間
        </label>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={periodFrom}
            max="2099-12"
            onChange={(e) => {
              const val = e.target.value;
              if (!val || /^\d{4}-\d{2}$/.test(val)) handlePeriodFromChange(val);
            }}
            className={`flex-1 rounded-xl border bg-surface px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 ${
              periodError ? 'border-danger focus:border-danger' : 'border-border focus:border-accent'
            }`}
          />
          <span className="text-text-muted text-sm">〜</span>
          <input
            type="month"
            value={periodTo}
            max="2099-12"
            onChange={(e) => {
              const val = e.target.value;
              if (!val || /^\d{4}-\d{2}$/.test(val)) handlePeriodToChange(val);
            }}
            className={`flex-1 rounded-xl border bg-surface px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 ${
              periodError ? 'border-danger focus:border-danger' : 'border-border focus:border-accent'
            }`}
          />
        </div>
        {periodError && (
          <p className="mt-1.5 flex items-start gap-1 text-xs text-danger">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            {periodError}
          </p>
        )}
      </section>

      {/* ファイルアップロード */}
      <section>
        <label className="mb-2 block text-sm font-semibold text-text-primary">取込ファイル</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-text-muted">Hファイル</p>
            <FileDropZone label="Hファイル" file={hFile} onFileSelect={onHFileChange} onRemove={() => onHFileChange(null)} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-text-muted">EFファイル</p>
            <FileDropZone label="EFファイル" file={efFile} onFileSelect={onEfFileChange} onRemove={() => onEfFileChange(null)} />
          </div>
        </div>
      </section>

      {/* 次へ */}
      <div className="flex justify-end pt-2 flex-col items-end gap-3">
        {dataPeriodError && (
          <div className="rounded border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger break-words max-w-full">
            <AlertCircle size={16} className="inline mr-1.5 -mt-0.5" />
            {dataPeriodError}
          </div>
        )}
        <button
          onClick={handleNextClick}
          disabled={!canProceed || isValidatingFiles}
          className="rounded-xl flex items-center justify-center gap-2 bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {isValidatingFiles ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              ファイル内容を確認中...
            </>
          ) : (
            '次へ：病棟設定'
          )}
        </button>
      </div>
    </div>
  );
}
