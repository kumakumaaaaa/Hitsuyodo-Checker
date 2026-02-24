'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';

export interface UploadedFile {
  file: File;
  name: string;
  size: string;
  lineCount: number | null;
}

export type EvaluationMethod = 'necessity_1' | 'necessity_2';

interface FileUploadStepProps {
  evaluationMethod: EvaluationMethod;
  onEvaluationMethodChange: (method: EvaluationMethod) => void;
  hFile: UploadedFile | null;
  efFile: UploadedFile | null;
  onHFileChange: (file: UploadedFile | null) => void;
  onEfFileChange: (file: UploadedFile | null) => void;
  onNext: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function countLines(file: File): Promise<number> {
  const text = await file.text();
  return text.split('\n').filter((l) => l.trim().length > 0).length;
}

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

  const handleFile = useCallback(
    async (f: File) => {
      const lines = await countLines(f);
      onFileSelect({
        file: f,
        name: f.name,
        size: formatFileSize(f.size),
        lineCount: lines,
      });
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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <FileText size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
          <p className="text-xs text-text-muted">
            {file.size} · {file.lineCount?.toLocaleString() ?? '-'} 行
          </p>
        </div>
        <button
          onClick={onRemove}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover hover:text-danger"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
        isDragging
          ? 'border-accent bg-accent/5'
          : 'border-border hover:border-accent/50 hover:bg-surface-hover'
      }`}
    >
      <input
        type="file"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={handleInputChange}
        accept=".txt,.csv,.tsv"
      />
      <Upload
        size={24}
        className={`mb-2 ${isDragging ? 'text-accent' : 'text-text-muted'}`}
      />
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <p className="text-xs text-text-muted mt-1">
        ドラッグ＆ドロップ または クリックして選択
      </p>
    </div>
  );
}

export function FileUploadStep({
  evaluationMethod,
  onEvaluationMethodChange,
  hFile,
  efFile,
  onHFileChange,
  onEfFileChange,
  onNext,
}: FileUploadStepProps) {
  const canProceed = hFile !== null && efFile !== null;

  return (
    <div className="mx-auto max-w-2xl animate-slide-up">
      {/* 評価方式 */}
      <div className="mb-8">
        <label className="mb-3 block text-sm font-semibold text-text-primary">
          評価方式
        </label>
        <div className="flex gap-3">
          {[
            { value: 'necessity_1' as const, label: '看護必要度 Ⅰ' },
            { value: 'necessity_2' as const, label: '看護必要度 Ⅱ' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onEvaluationMethodChange(opt.value)}
              className={`flex-1 rounded-xl border-2 px-4 py-3.5 text-sm font-medium transition-all ${
                evaluationMethod === opt.value
                  ? 'border-accent bg-accent/8 text-accent shadow-sm'
                  : 'border-border text-text-secondary hover:border-accent/30 hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    evaluationMethod === opt.value
                      ? 'border-accent'
                      : 'border-text-muted'
                  }`}
                >
                  {evaluationMethod === opt.value && (
                    <div className="h-2.5 w-2.5 rounded-full bg-accent" />
                  )}
                </div>
                {opt.label}
              </div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-text-muted">
          <AlertCircle size={12} className="inline mr-1 -mt-0.5" />
          評価方式によって判定基準（評価方法・閾値）が異なります
        </p>
      </div>

      {/* ファイルアップロード */}
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-text-primary">
            Hファイル
          </label>
          <FileDropZone
            label="Hファイルをアップロード"
            file={hFile}
            onFileSelect={onHFileChange}
            onRemove={() => onHFileChange(null)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-text-primary">
            EFファイル
          </label>
          <FileDropZone
            label="EFファイルをアップロード"
            file={efFile}
            onFileSelect={onEfFileChange}
            onRemove={() => onEfFileChange(null)}
          />
        </div>
      </div>

      {/* 次へ */}
      <div className="mt-8 flex justify-end">
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
