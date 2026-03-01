import { create } from 'zustand';
import type { UploadedFile, EvaluationMethod } from '@/components/records/SetupStep';
import type { DateRange } from '@/lib/file-parser/validate-data-period';
import type { HRecordEntry } from '@/lib/file-parser/parse-h-file';
import type { EfActEntry } from '@/lib/file-parser/parse-ef-file';
import type { GenIIDailyScore } from '@/types/daily-score';

interface RecordSessionState {
  recordId: number | null;
  evaluationMethod: EvaluationMethod;
  hFile: UploadedFile | null;
  efFile: UploadedFile | null;
  hDateRange: DateRange | null;
  efDateRange: DateRange | null;
  hRecords: HRecordEntry[] | null;
  efRecords: EfActEntry[] | null;
  scoreMap: Map<string, GenIIDailyScore> | null;
  
  // セッションを更新する（レコード生成完了後に呼ぶ）
  setSession: (data: {
    recordId: number;
    evaluationMethod: EvaluationMethod;
    hFile: UploadedFile | null;
    efFile: UploadedFile | null;
    hDateRange: DateRange | null;
    efDateRange: DateRange | null;
    hRecords: HRecordEntry[] | null;
    efRecords: EfActEntry[] | null;
    scoreMap: Map<string, GenIIDailyScore> | null;
  }) => void;
  
  // セッションをクリアする
  clearSession: () => void;
}

/**
 * 画面遷移（/records/new -> /records/[id]）時に、メモリ上のファイルや解析結果を
 * 保持して受け渡すためのGlobal Store.
 * DBには保存しないためリロードで消滅する
 */
export const useRecordSessionStore = create<RecordSessionState>((set) => ({
  recordId: null,
  evaluationMethod: 'necessity_2',
  hFile: null,
  efFile: null,
  hDateRange: null,
  efDateRange: null,
  hRecords: null,
  efRecords: null,
  scoreMap: null,

  setSession: (data) => set({ ...data }),
  clearSession: () => set({
    recordId: null,
    evaluationMethod: 'necessity_2',
    hFile: null,
    efFile: null,
    hDateRange: null,
    efDateRange: null,
    hRecords: null,
    efRecords: null,
    scoreMap: null,
  }),
}));
