import { create } from 'zustand';
import type { UploadedFile, EvaluationMethod } from '@/components/records/SetupStep';
import type { DateRange } from '@/lib/file-parser/validate-data-period';

interface RecordSessionState {
  recordId: number | null;
  evaluationMethod: EvaluationMethod;
  hFile: UploadedFile | null;
  efFile: UploadedFile | null;
  hDateRange: DateRange | null;
  efDateRange: DateRange | null;
  
  // セッションを更新する（レコード生成完了後に呼ぶ）
  setSession: (data: {
    recordId: number;
    evaluationMethod: EvaluationMethod;
    hFile: UploadedFile | null;
    efFile: UploadedFile | null;
    hDateRange: DateRange | null;
    efDateRange: DateRange | null;
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

  setSession: (data) => set({ ...data }),
  clearSession: () => set({
    recordId: null,
    evaluationMethod: 'necessity_2',
    hFile: null,
    efFile: null,
    hDateRange: null,
    efDateRange: null,
  }),
}));
