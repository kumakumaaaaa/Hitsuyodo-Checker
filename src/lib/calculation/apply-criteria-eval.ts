import { GenIIDailyScore } from '@/types/daily-score';

/**
 * 施設基準等の該当患者割合を判定するための P1/P2/P3 フラグを各日のスコアに付与する。
 * 
 * @param scoreMap HファイルとEFファイルから作成された各患者・日ごとのスコアマップ
 */
export function applyCriteriaEval(scoreMap: Map<string, GenIIDailyScore>): void {
  for (const score of scoreMap.values()) {
    // 1. 集計対象の絞り込み
    // 一般病棟では、TAR0010（tarFlag）が 0 または 1 の場合のみ評価対象とする
    score.isTargetForEval = (score.tarFlag === 0 || score.tarFlag === 1);

    if (!score.isTargetForEval) {
      score.meetsP1 = false;
      score.meetsP2 = false;
      score.meetsP3 = false;
      continue;
    }

    // 2. 判定ロジックの適用
    const { aTotal, bTotal, cTotal } = score;

    // パターン P1: A得点3点以上 または C得点1点以上
    score.meetsP1 = (aTotal >= 3) || (cTotal >= 1);

    // パターン P2: (A得点2点以上 かつ B得点3点以上) または A得点3点以上 または C得点1点以上
    score.meetsP2 = (aTotal >= 2 && bTotal >= 3) || (aTotal >= 3) || (cTotal >= 1);

    // パターン P3: A得点1点以上 または C得点1点以上
    score.meetsP3 = (aTotal >= 1) || (cTotal >= 1);
  }
}
