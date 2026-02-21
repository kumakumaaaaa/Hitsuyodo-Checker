'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StepIndicator } from '@/components/records/StepIndicator';
import { SetupStep } from '@/components/records/SetupStep';
import { WardConfirmStep } from '@/components/records/WardConfirmStep';
import type { UploadedFile, EvaluationMethod, WardSetting } from '@/components/records/SetupStep';
import { recordRepository } from '@/lib/db/repositories/record-repository';

const STEPS = [
  { label: '基本設定', description: '評価方式・タイトル・期間・ファイル' },
  { label: '病棟設定・生成', description: '病棟コード設定・レコード生成' },
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

  // Step 2 state
  const [wards, setWards] = useState<WardSetting[]>([]);

  const handleConfirm = useCallback(async () => {
    await recordRepository.create({
      title: title || `${periodFrom}分`,
      periodFrom: `${periodFrom}-01`,
      periodTo: `${periodTo}-01`,
      hFileName: hFile?.name ?? '',
      efFileName: efFile?.name ?? '',
      wards: wards.map((w) => ({
        wardCode: w.wardCode,
        wardName: w.wardName,
        nursingNeedType: w.nursingNeedType,
      })),
    });

    setTimeout(() => {
      router.push('/');
    }, 1500);
  }, [title, periodFrom, periodTo, hFile, efFile, wards, router]);

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
            onNext={() => setCurrentStep(2)}
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
