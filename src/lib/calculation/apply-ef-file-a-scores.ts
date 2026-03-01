import { EfActEntry } from '../file-parser/parse-ef-file';
import { GenIIDailyScore } from '@/types/daily-score';
import { A_ITEM_DURATIONS } from './a-item-definitions';
import { A_ITEM_MASTER, A3_EXCLUDED_DRUGS } from './a-item-master';

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

export function applyEfFileAScores(efRecords: EfActEntry[], scoreMap: Map<string, GenIIDailyScore>): void {
  
  // A3判定用: 患者・日付ごとに投与されたユニークな注射薬剤(30番台)の receiptCode を集める Set
  const a3DrugSets = new Map<string, Set<string>>();

  // === Pass 1: 日次トリガー判定 ===
  for (const record of efRecords) {
    const key = `${record.patientNo}|${record.evalDate}`;
    const score = scoreMap.get(key);

    if (!score) {
      // Hファイルに存在しない日・患者のEFデータはスキップ
      continue;
    }

    // --- A3 判定ロジック (除外薬剤を除いた30番台のユニーク数) ---
    const dcStr = String(record.dataCategory);
    if (dcStr.startsWith('3')) { // 31, 32, 33 等
      // 除外マスターに含まれないかチェック
      if (!A3_EXCLUDED_DRUGS[record.receiptCode]) {
        if (!a3DrugSets.has(key)) {
          a3DrugSets.set(key, new Set<string>());
        }
        a3DrugSets.get(key)!.add(record.receiptCode);
      }
    }

    // --- その他 A項目のマスタ判定 ---
    const matchedAItem = A_ITEM_MASTER[record.receiptCode];
    if (matchedAItem) {
      const { itemNo, subItem } = matchedAItem;

      if (itemNo === 'GEN_A6') {
        // A6サブ項目 (①〜⑪)
        let subIndex = 0;
        switch(subItem) {
          case '①': subIndex = 1; break;
          case '②': subIndex = 2; break;
          case '③': subIndex = 3; break;
          case '④': subIndex = 4; break;
          case '⑤': subIndex = 5; break;
          case '⑥': subIndex = 6; break;
          case '⑦': subIndex = 7; break;
          case '⑧': subIndex = 8; break;
          case '⑨': subIndex = 9; break;
          case '⑩': subIndex = 10; break;
          case '⑪': subIndex = 11; break;
        }
        if (subIndex >= 1 && subIndex <= 11) {
          const field = `a6_${subIndex}` as keyof GenIIDailyScore;
          (score as any)[field] = 1;
        }
      } else {
        // GEN_A1, GEN_A2, GEN_A4, GEN_A5, GEN_A7 を小文字のプロパティ(a1, a2...)にマッピング
        // ※ A3 は後で集計して判定する
        if (itemNo !== 'GEN_A3') {
          const fieldId = itemNo.replace('GEN_A', 'a').toLowerCase();
          if (fieldId in score) {
            (score as any)[fieldId] = 1;
          }
        }
      }
    }
  }

  // --- A3のトリガーフラグを立てる ---
  for (const [key, drugSet] of a3DrugSets.entries()) {
    if (drugSet.size >= 3) {
      const score = scoreMap.get(key);
      if (score) {
        score.a3 = 1;
      }
    }
  }

  // === Pass 2: 有効期間の展開 (Forward Propagation: A3, A7) ===
  const scoresByPatient = new Map<string, GenIIDailyScore[]>();
  for (const score of scoreMap.values()) {
    if (!scoresByPatient.has(score.patientNo)) {
      scoresByPatient.set(score.patientNo, []);
    }
    scoresByPatient.get(score.patientNo)!.push(score);
  }

  for (const [patientNo, dailyScores] of scoresByPatient.entries()) {
    // 評価日順にソート
    dailyScores.sort((a, b) => a.evalDate.localeCompare(b.evalDate));

    // A3, A7 の「最後にトリガーされた日」を保持
    const lastTriggeredDate: Record<string, string> = {};

    for (const score of dailyScores) {
      const today = score.evalDate;

      const aExtKeys = [
        { key: 'a3', itemCode: 'GEN_A3' },
        { key: 'a7', itemCode: 'GEN_A7' },
      ];

      for (const { key: fieldKey, itemCode } of aExtKeys) {
        const val = (score as any)[fieldKey];

        // 1. 今日のレコードが 1 (Pass1で立った) なら、lastTriggeredDate を更新
        if (val === 1) {
          lastTriggeredDate[fieldKey] = today;
        } 
        // 2. 今日が 0 だが、過去にトリガーがあり、有効期間内であれば 1 にする
        else {
          const triggerDate = lastTriggeredDate[fieldKey];
          if (triggerDate) {
            const duration = A_ITEM_DURATIONS[itemCode] ?? 0;
            if (duration > 0) {
              // 期間=7の場合: triggerDate(Day 1) + 6日 までが有効
              const expiryDate = addDaysToDateString(triggerDate, duration - 1);
              if (today <= expiryDate) {
                (score as any)[fieldKey] = 1;
              }
            }
          }
        }
      }

      // === Pass 3: A6判定 と aTotal 算出 ===
      
      // A6判定（サブ項目のいずれかが1なら1）
      score.a6 = (
        score.a6_1 || score.a6_2 || score.a6_3 || score.a6_4 || 
        score.a6_5 || score.a6_6 || score.a6_7 || score.a6_8 || 
        score.a6_9 || score.a6_10 || score.a6_11
      ) ? 1 : 0;

      // aTotal算出 (a1〜a7の合計)
      score.aTotal = score.a1 + score.a2 + score.a3 + score.a4 + 
                     score.a5 + score.a6 + score.a7;
    }
  }
}
