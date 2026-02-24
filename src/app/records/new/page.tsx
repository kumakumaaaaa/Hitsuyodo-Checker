'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StepIndicator } from '@/components/records/StepIndicator';
import { SetupStep } from '@/components/records/SetupStep';
import { WardConfirmStep } from '@/components/records/WardConfirmStep';
import type { UploadedFile, EvaluationMethod, WardSetting } from '@/components/records/SetupStep';
import { extractWardCodes } from '@/lib/file-parser/extract-ward-codes';
import { processHFile } from '@/lib/file-parser/h-parser';
import { processEfFile } from '@/lib/file-parser/ef-parser';
import { getWardDefault } from '@/lib/settings/ward-defaults';
import { recordRepository } from '@/lib/db/repositories/record-repository';

const STEPS = [
  { label: '基本設定', description: '評価方式・タイトル・期間・ファイル' },
  { label: '病棟設定・生成', description: '病棟コード確認・レコード生成' },
];

export default function NewRecordPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 state
  const [evaluationMethod, setEvaluationMethod] = useState<EvaluationMethod>('necessity_2');
  const [hFile, setHFile] = useState<UploadedFile | null>(null);
  const [efFile, setEfFile] = useState<UploadedFile | null>(null);
  const [title, setTitle] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);

  // Step 2 state
  const [extractedWardCodes, setExtractedWardCodes] = useState<string[]>([]);
  const [wards, setWards] = useState<WardSetting[]>([]);
  const [hPeriod, setHPeriod] = useState<{ minDate: string | null; maxDate: string | null } | null>(null);
  const [efPeriod, setEfPeriod] = useState<{ minDate: string | null; maxDate: string | null } | null>(null);

  // Step 1 → Step 2: ファイルから病棟コードを抽出して遷移
  const handleNextToStep2 = useCallback(async () => {
    setSetupError(null);
    const { wardCodes: codes, minDate, maxDate, hPeriod: hp, efPeriod: ep } = await extractWardCodes(
      hFile?.file ?? null,
      efFile?.file ?? null
    );

    // アップロードされたファイルの実施年月日(min/max)が、ユーザー指定の期間（年月）に収まっているかチェック
    if (minDate && maxDate) {
      const minMonth = minDate.substring(0, 7);
      const maxMonth = maxDate.substring(0, 7);
      if (minMonth < periodFrom || maxMonth > periodTo) {
        setSetupError(`取込ファイル内のデータ期間（${minDate} 〜 ${maxDate}）が、指定された対象期間（${periodFrom} 〜 ${periodTo}）の月度から外れたデータを含んでいます。\n対象期間の設定またはファイルを見直してください。`);
        return;
      }
    }

    setExtractedWardCodes(codes);
    setHPeriod(hp);
    setEfPeriod(ep);

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
    setCurrentStep(2);
  }, [hFile, efFile, wards]);

  const handleConfirm = useCallback(async () => {
    try {
      const recordId = await recordRepository.create({
        title: title || `${periodFrom}分`,
        periodFrom: `${periodFrom}-01`,
        periodTo: `${periodTo}-01`,
        evaluationMethod,
        hFileName: hFile?.name ?? '',
        efFileName: efFile?.name ?? '',
        wards: wards.map((w) => ({
          wardCode: w.wardCode,
          wardName: w.wardName,
          admissionTypeId: w.admissionTypeId,
        })),
      });

      // ファイルのパースとDB保存（バルクインサート）
      if (hFile?.file) {
        await processHFile(recordId, hFile.file);
      }
      if (efFile?.file) {
        await processEfFile(recordId, efFile.file);
      }

      // H/EFの生データが保存された直後、対象患者と病棟期間に対する「評価票の受け皿」を一括生成する
      const { generateEvaluationReceivers } = await import('@/lib/evaluations/receiver-generator');
      await generateEvaluationReceivers(recordId);

      // B項目のマッピングとスコア計算を実行
      const { mapBItemsFromHFile } = await import('@/lib/evaluations/b-score-mapper');
      await mapBItemsFromHFile(recordId);

      // TODO: レコードステータスを processing または done に更新する処理を追加

      setTimeout(() => {
        router.push(`/records/${recordId}`);
      }, 1500);
    } catch (e) {
      console.error('Record creation failed:', e);
      throw e;
    }
  }, [title, periodFrom, periodTo, hFile, efFile, wards, evaluationMethod, router]);

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
            error={setupError}
          />
        )}

        {currentStep === 2 && (
          <WardConfirmStep
            evaluationMethod={evaluationMethod}
            hFile={hFile}
            efFile={efFile}
            title={title}
            periodFrom={periodFrom}
            periodTo={periodTo}
            extractedWardCodes={extractedWardCodes}
            wards={wards}
            onWardsChange={setWards}
            onBack={() => setCurrentStep(1)}
            onConfirm={handleConfirm}
            hPeriod={hPeriod}
            efPeriod={efPeriod}
          />
        )}
      </main>
    </div>
  );
}
