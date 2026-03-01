import { GenIIDailyScore } from '@/types/daily-score';

/**
 * 評価マップ（Map）を配列に変換し、患者番号・日付でソートする。
 * 
 * @param scoreMap 計算済みの各患者・日ごとのスコアマップ
 * @returns ソート済みのGenIIDailyScore配列
 */
export function convertScoreMapToArray(scoreMap: Map<string, GenIIDailyScore>): GenIIDailyScore[] {
  // Mapの値を配列に変換
  const records = Array.from(scoreMap.values());

  // ソート：患者番号（昇順） -> 実施日付（昇順）
  records.sort((a, b) => {
    if (a.patientNo !== b.patientNo) {
      return a.patientNo.localeCompare(b.patientNo);
    }
    return a.evalDate.localeCompare(b.evalDate);
  });

  return records;
}
