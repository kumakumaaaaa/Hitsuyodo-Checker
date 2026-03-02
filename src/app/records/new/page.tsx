'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StepIndicator } from '@/components/records/StepIndicator';
import { SetupStep } from '@/components/records/SetupStep';
import { WardConfirmStep } from '@/components/records/WardConfirmStep';
import type { UploadedFile, EvaluationMethod, WardSetting } from '@/components/records/SetupStep';
import type { DateRange } from '@/lib/file-parser/validate-data-period';
import { extractWardCodes } from '@/lib/file-parser/extract-ward-codes';
import { getWardDefault } from '@/lib/settings/ward-defaults';
import { recordRepository } from '@/lib/db/repositories/record-repository';
import { useRecordSessionStore } from '@/lib/store/record-session-store';
import { parseHFile } from '@/lib/file-parser/parse-h-file';
import { parseEfFile } from '@/lib/file-parser/parse-ef-file';
import { buildEmptyScoreMap } from '@/lib/calculation/build-empty-map';
import { applyHFileScores } from '@/lib/calculation/apply-h-file-scores';
import { applyEfFileCScores } from '@/lib/calculation/apply-ef-file-c-scores';
import { applyEfFileAScores } from '@/lib/calculation/apply-ef-file-a-scores';
import { applyCriteriaEval } from '@/lib/calculation/apply-criteria-eval';
import { convertScoreMapToArray } from '@/lib/calculation/convert-to-array';

const STEPS = [
  { label: '基本設定', description: '評価方式・タイトル・期間・ファイル' },
  { label: '病棟設定・生成', description: '病棟コード確認・レコード生成' },
];

export default function NewRecordPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const setSession = useRecordSessionStore((state) => state.setSession);

  // Step 1 state
  const [evaluationMethod, setEvaluationMethod] = useState<EvaluationMethod>('necessity_2');
  const [hFile, setHFile] = useState<UploadedFile | null>(null);
  const [efFile, setEfFile] = useState<UploadedFile | null>(null);
  const [title, setTitle] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  // Step 2 state
  const [extractedWardCodes, setExtractedWardCodes] = useState<string[]>([]);
  const [wards, setWards] = useState<WardSetting[]>([]);
  const [hDateRange, setHDateRange] = useState<DateRange | null>(null);
  const [efDateRange, setEfDateRange] = useState<DateRange | null>(null);

  // Step 1 → Step 2: ファイルから病棟コードを抽出して遷移
  const handleNextToStep2 = useCallback(async (hRange: DateRange | null, efRange: DateRange | null) => {
    const codes = await extractWardCodes(
      hFile?.file ?? null,
      efFile?.file ?? null
    );
    setExtractedWardCodes(codes);

    // 抽出した病棟コードからWardSettingを初期化
    // 前回入力した値を保持、なければデフォルト設定を適用
    const existingMap = new Map(wards.map((w) => [w.wardCode, w]));
    const newWards: WardSetting[] = codes.map((code) => {
      const existing = existingMap.get(code);
      const wardDefault = getWardDefault(code);
      return {
        id: existing?.id ?? crypto.randomUUID(),
        wardCode: code,
        wardName: existing?.wardName ?? wardDefault?.wardName ?? '',
        admissionTypeId: existing?.admissionTypeId ?? wardDefault?.admissionTypeId ?? null,
      };
    });
    setWards(newWards);
    setHDateRange(hRange);
    setEfDateRange(efRange);
    setCurrentStep(2);
  }, [hFile, efFile, wards]);

  const handleConfirm = useCallback(async (onProgress?: (step: number) => void) => {
    try {
      // Step 1: DB保存
      onProgress?.(1);
      const toYear = parseInt(periodTo.split('-')[0], 10);
      const toMonth = parseInt(periodTo.split('-')[1], 10);
      const lastDay = new Date(toYear, toMonth, 0).getDate();
      const periodToFormatted = `${periodTo}-${lastDay.toString().padStart(2, '0')}`;

      const recordId = await recordRepository.create({
        title: title || `${periodFrom}分`,
        periodFrom: `${periodFrom}-01`,
        periodTo: periodToFormatted,
        evaluationMethod,
        hFileName: hFile?.name ?? '',
        efFileName: efFile?.name ?? '',
        hPeriodFrom: hDateRange?.minDate ?? null,
        hPeriodTo: hDateRange?.maxDate ?? null,
        efPeriodFrom: efDateRange?.minDate ?? null,
        efPeriodTo: efDateRange?.maxDate ?? null,
        wards: wards.map((w) => ({
          wardCode: w.wardCode,
          wardName: w.wardName,
          admissionTypeId: w.admissionTypeId,
        })),
      });

      // Step 2: ファイルパース
      onProgress?.(2);
      const hRecords = hFile ? await parseHFile(hFile.file) : null;
      const efRecords = efFile ? await parseEfFile(efFile.file) : null;

      // Step 3: 評価マップ生成・B項目計算
      onProgress?.(3);
      let scoreMap = null;
      let dailyScores = null;
      
      if (hRecords) {
        scoreMap = buildEmptyScoreMap(hRecords);
        applyHFileScores(hRecords, scoreMap);

        // Step 4: A・C項目計算
        onProgress?.(4);
        if (efRecords) {
          applyEfFileCScores(efRecords, scoreMap);
          applyEfFileAScores(efRecords, scoreMap);
        }

        // Step 5: 施設基準判定
        onProgress?.(5);
        applyCriteriaEval(scoreMap);

        // Step 6: 配列変換・保存
        onProgress?.(6);
        dailyScores = convertScoreMapToArray(scoreMap);
      }

      setSession({
        recordId,
        evaluationMethod,
        hFile,
        efFile,
        hDateRange,
        efDateRange,
        hRecords,
        efRecords,
        scoreMap,
        dailyScores,
      });

      setTimeout(() => {
        router.push(`/records/${recordId}`);
      }, 1500);
    } catch (e) {
      console.error('Record creation failed:', e);
      throw e;
    }
  }, [title, periodFrom, periodTo, hFile, efFile, hDateRange, efDateRange, wards, evaluationMethod, router, setSession]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* ホームへ戻る */}
        <div className="mb-2 flex items-center">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <ArrowLeft size={16} />
            ホームへ戻る
          </button>
        </div>

        <h1 className="text-xl font-bold text-text-primary text-center mb-2">新規レコード作成</h1>

        <StepIndicator currentStep={currentStep} steps={STEPS} />

        {currentStep === 1 && (
          <SetupStep
            evaluationMethod={evaluationMethod}
            onEvaluationMethodChange={setEvaluationMethod}
            hFile={hFile}
            efFile={efFile}
            onHFileChange={setHFile}
            onEfFileChange={setEfFile}
            title={title}
            onTitleChange={setTitle}
            periodFrom={periodFrom}
            onPeriodFromChange={setPeriodFrom}
            periodTo={periodTo}
            onPeriodToChange={setPeriodTo}
            onNext={handleNextToStep2}
          />
        )}

        {currentStep === 2 && (
          <WardConfirmStep
            evaluationMethod={evaluationMethod}
            hFile={hFile}
            efFile={efFile}
            hDateRange={hDateRange}
            efDateRange={efDateRange}
            title={title}
            periodFrom={periodFrom}
            periodTo={periodTo}
            extractedWardCodes={extractedWardCodes}
            wards={wards}
            onWardsChange={setWards}
            onBack={() => setCurrentStep(1)}
            onConfirm={handleConfirm}
          />
        )}
      </main>
    </div>
  );
}
