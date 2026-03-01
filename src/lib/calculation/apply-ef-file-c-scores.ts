import { EfActEntry } from '../file-parser/parse-ef-file';
import { GenIIDailyScore } from '@/types/daily-score';
import { C_ITEM_DURATIONS } from './c-item-definitions';
import { C_ITEM_MASTER } from './c-item-master';

/**
 * TSVマスタファイルから生成した C項目のレセプト電算コード定義を読み込む
 */
function getCItemMaster(): Map<string, { itemNo: string, subItem?: string }> {
  // C_ITEM_MASTER (Object) を Map に変換して返す
  const map = new Map<string, { itemNo: string, subItem?: string }>();
  for (const [receiptCode, definition] of Object.entries(C_ITEM_MASTER)) {
    map.set(receiptCode, definition);
  }
  return map;
}

/**
 * 基準日(YYYYMMDD)に指定日数(days)を加算した日付(YYYYMMDD)を返す
 */
function addDaysToDateString(dateStr: string, days: number): string {
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // 0-indexed
  const day = parseInt(dateStr.substring(6, 8), 10);
  
  const d = new Date(year, month, day);
  d.setDate(d.getDate() + days);
  
  const newYear = d.getFullYear();
  const newMonth = String(d.getMonth() + 1).padStart(2, '0');
  const newDay = String(d.getDate()).padStart(2, '0');
  
  return `${newYear}${newMonth}${newDay}`;
}

export function applyEfFileCScores(efRecords: EfActEntry[], scoreMap: Map<string, GenIIDailyScore>): void {
  const cItemMaster = getCItemMaster();

  // === Pass 1: トリガー日の抽出 ===
  // receiptCode がマスターに合致するレコードを見つけ、
  // 当該日のスコアフラグを 1 に立てる
  for (const record of efRecords) {
    const key = `${record.patientNo}|${record.evalDate}`;
    const score = scoreMap.get(key);

    if (!score) {
      // Hファイルに存在しない日・患者のEFデータはスキップ
      continue;
    }

    const matchedCItem = cItemMaster.get(record.receiptCode);
    if (!matchedCItem) continue;

    // itemNo = "GEN_C15", subItem = "①" などの形式
    const { itemNo, subItem } = matchedCItem;
    
    // C21はサブ項目で分かれているため特殊処理
    if (itemNo === 'GEN_C21') {
      if (subItem === '①') score.c21_1 = 1;
      else if (subItem === '②') score.c21_2 = 1;
      else if (subItem === '③') score.c21_3 = 1;
    } else {
      // その他: c15, c16 ... にマッピング
      const fieldId = itemNo.replace('GEN_C', 'c').toLowerCase();
      // TypeScript の key チェックを安全に行うため
      if (fieldId in score) {
        (score as any)[fieldId] = 1;
      }
    }
  }

  // === Pass 2: 有効期間の展開 (Forward Propagation) ===
  // patientNo ごとにエントリを日付順で処理し、スコアを未来へ配る
  // C15〜C23のすべてについて、発生日 (Day1) から定数で定義された日数分 1 に展開

  // scoreMap 全件を配列にして処理対象の患者一覧とデータをグループ化
  const scoresByPatient = new Map<string, GenIIDailyScore[]>();
  for (const score of scoreMap.values()) {
    if (!scoresByPatient.has(score.patientNo)) {
      scoresByPatient.set(score.patientNo, []);
    }
    scoresByPatient.get(score.patientNo)!.push(score);
  }

  for (const [patientNo, dailyScores] of scoresByPatient.entries()) {
    // 評価日順にソート（重要：過去から未来へ展開するため）
    dailyScores.sort((a, b) => a.evalDate.localeCompare(b.evalDate));

    // 各C項目の「最後にトリガーされた日」を保持
    const lastTriggeredDate: Record<string, string> = {};

    for (const score of dailyScores) {
      const today = score.evalDate;

      // c15からc23までチェック
      const cKeys = [
        { key: 'c15', itemCode: 'GEN_C15' },
        { key: 'c16', itemCode: 'GEN_C16' },
        { key: 'c17', itemCode: 'GEN_C17' },
        { key: 'c18', itemCode: 'GEN_C18' },
        { key: 'c19', itemCode: 'GEN_C19' },
        { key: 'c20', itemCode: 'GEN_C20' },
        { key: 'c21_1', itemCode: 'GEN_C21-①' },
        { key: 'c21_2', itemCode: 'GEN_C21-②' },
        { key: 'c21_3', itemCode: 'GEN_C21-③' },
        { key: 'c22', itemCode: 'GEN_C22' },
        { key: 'c23', itemCode: 'GEN_C23' },
      ];

      for (const { key: fieldKey, itemCode } of cKeys) {
        const val = (score as any)[fieldKey];

        // 1. 今日のレコードが 1 (Pass1で立った) なら、lastTriggeredDate を更新
        if (val === 1) {
          lastTriggeredDate[fieldKey] = today;
        } 
        // 2. 今日が 0 だが、過去にトリガーがあり、有効期間内であれば 1 にする
        else {
          const triggerDate = lastTriggeredDate[fieldKey];
          if (triggerDate) {
            const duration = C_ITEM_DURATIONS[itemCode] ?? 0;
            if (duration > 0) {
              // 期間=11の場合: triggerDate(Day 1) + 10日 までが有効
              const expiryDate = addDaysToDateString(triggerDate, duration - 1);
              if (today <= expiryDate) {
                (score as any)[fieldKey] = 1;
              }
            }
          }
        }
      }

      // === Pass 3: 各日の cTotal 算出 ===
      // C15〜C23 のフラグを単に合計する（重複があれば 1以上になる）
      score.cTotal = score.c15 + score.c16 + score.c17 + score.c18 + 
                     score.c19 + score.c20 + score.c21_1 + score.c21_2 + 
                     score.c21_3 + score.c22 + score.c23;
    }
  }
}
