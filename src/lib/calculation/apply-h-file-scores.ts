import type { HRecordEntry } from '../file-parser/parse-h-file';
import { H_COL } from '../file-parser/parse-h-file';
import type { GenIIDailyScore } from '@/types/daily-score';

/**
 * HFileレコード(ASS0021およびTAR0010)からB項目およびフラグをscoreMapに書き込む
 * @param hRecords - 全てのHRecordEntry
 * @param scoreMap - buildEmptyScoreMap で生成した 器オブジェクトのMap
 */
export function applyHFileScores(
  hRecords: HRecordEntry[],
  scoreMap: Map<string, GenIIDailyScore>
): void {
  for (const record of hRecords) {
    const { columns } = record;
    
    // 対象行のキーを生成
    const patientNo = columns[H_COL.PATIENT_NO]?.trim();
    const evalDate = columns[H_COL.EVAL_DATE]?.trim();
    const key = `${patientNo}|${evalDate}`;
    
    // 該当する器を取得
    const score = scoreMap.get(key);
    if (!score) continue; // 万が一器が無い場合は無視する
    
    const payloadType = columns[H_COL.PAYLOAD_TYPE]?.trim();
    
    // ----------------------------------------------------
    // B項目の書き込み (ASS0021)
    // ----------------------------------------------------
    if (payloadType === 'ASS0021') {
      // payloadスタート位置は 9 (H_COL.PAYLOAD_START) から
      // index 9: 寝返り, index 10: 移乗 ...
      score.b1 = parseInt(columns[H_COL.PAYLOAD_START]) || 0;
      score.b2 = parseInt(columns[H_COL.PAYLOAD_START + 1]) || 0;
      score.b3 = parseInt(columns[H_COL.PAYLOAD_START + 2]) || 0;
      score.b4 = parseInt(columns[H_COL.PAYLOAD_START + 3]) || 0;
      score.b5 = parseInt(columns[H_COL.PAYLOAD_START + 4]) || 0;
      score.b6 = parseInt(columns[H_COL.PAYLOAD_START + 5]) || 0;
      score.b7 = parseInt(columns[H_COL.PAYLOAD_START + 6]) || 0;
      
      score.b2_assist = parseInt(columns[H_COL.PAYLOAD_START + 7]) || 0;
      score.b3_assist = parseInt(columns[H_COL.PAYLOAD_START + 8]) || 0;
      score.b4_assist = parseInt(columns[H_COL.PAYLOAD_START + 9]) || 0;
      score.b5_assist = parseInt(columns[H_COL.PAYLOAD_START + 10]) || 0;

      // bTotal（掛け算ルール適用）
      // 介助が 0(なし) の場合、患者の状態が 2(要介助) であってもスコアは 0 となる
      score.bTotal = 
        score.b1 + 
        (score.b2 * score.b2_assist) +
        (score.b3 * score.b3_assist) +
        (score.b4 * score.b4_assist) +
        (score.b5 * score.b5_assist) +
        score.b6 +
        score.b7;
    }
    
    // ----------------------------------------------------
    // 判定対象フラグの書き込み (TAR0010)
    // ----------------------------------------------------
    else if (payloadType === 'TAR0010') {
      score.tarFlag = parseInt(columns[H_COL.PAYLOAD_START]) || 0;
      
      // TAR0010:0,1 が一般病棟の集計対象
      score.isTargetForEval = (score.tarFlag === 0 || score.tarFlag === 1);
    }
  }
}
