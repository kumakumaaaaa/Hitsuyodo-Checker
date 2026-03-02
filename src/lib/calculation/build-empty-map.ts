import type { HRecordEntry } from '../file-parser/parse-h-file';
import { H_COL } from '../file-parser/parse-h-file';
import type { GenIIDailyScore } from '@/types/daily-score';

/**
 * Hファイルの全行から空の評価マップ（GenIIDailyScoreのベース）を構築する
 * キーは "patientNo|evalDate"
 * 
 * @param hRecords - フィルタ適用済みの HRecordEntry の配列
 * @returns Map<string, GenIIDailyScore> 
 */
export function buildEmptyScoreMap(hRecords: HRecordEntry[]): Map<string, GenIIDailyScore> {
  const scoreMap = new Map<string, GenIIDailyScore>();

  for (const record of hRecords) {
    const { columns } = record;
    const patientNo = columns[H_COL.PATIENT_NO]?.trim() || '';
    const evalDate = columns[H_COL.EVAL_DATE]?.trim() || '';
    
    // 患者番号または実施日が不正なレコードはスキップ（パーサー側ですでに除外されている想定だが念の為）
    if (!patientNo || !evalDate) continue;

    const key = `${patientNo}|${evalDate}`;

    // 同一患者・同一日のレコードが複数ある場合、最初の1件目で器を作成する
    // Hファイルは1日1レコードが原則だが、複数のペイロード（ASS/TAR等）が同一日に存在するため、
    // keyが存在しない場合のみ作成する
    if (!scoreMap.has(key)) {
      scoreMap.set(key, {
        // キー情報
        patientNo,
        evalDate,
        wardCode: columns[H_COL.WARD_CODE]?.trim() || '',
        admissionDate: columns[H_COL.ADMISSION_DATE]?.trim() || '',
        dischargeDate: columns[H_COL.DISCHARGE_DATE]?.trim() || '',
        
        // 入院日からの経過日数を計算
        daysFromAdmission: (() => {
          const admStr = columns[H_COL.ADMISSION_DATE]?.trim() || '';
          if (evalDate.length !== 8 || admStr.length !== 8) return 0;
          const ed = new Date(`${evalDate.slice(0,4)}-${evalDate.slice(4,6)}-${evalDate.slice(6,8)}`);
          const ad = new Date(`${admStr.slice(0,4)}-${admStr.slice(4,6)}-${admStr.slice(6,8)}`);
          if (isNaN(ed.getTime()) || isNaN(ad.getTime())) return 0;
          return Math.max(0, Math.floor((ed.getTime() - ad.getTime()) / (1000 * 60 * 60 * 24)));
        })(),
        
        // TARフラグ
        tarFlag: 0,
        isTargetForEval: false,

        // A項目
        a1: 0, a2: 0, a3: 0, a4: 0, a5: 0, a6: 0, a7: 0, aTotal: 0,
        // A6サブ項目
        a6_1: 0, a6_2: 0, a6_3: 0, a6_4: 0, a6_5: 0, a6_6: 0,
        a6_7: 0, a6_8: 0, a6_9: 0, a6_10: 0, a6_11: 0,

        // B項目
        b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0, b7: 0,
        b2_assist: 0, b3_assist: 0, b4_assist: 0, b5_assist: 0,
        bTotal: 0,

        // C項目
        c15: 0, c16: 0, c17: 0, c18: 0, c19: 0, c20: 0,
        c21_1: 0, c21_2: 0, c21_3: 0, c22: 0, c23: 0,
        cTotal: 0,

        // 判定結果
        meetsP1: false,
        meetsP2: false,
        meetsP3: false,
      });
    }
  }

  return scoreMap;
}
