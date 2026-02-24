import { getDB } from '../db';

/**
 * Hファイル（h_record）に保存されたASS0021等のB項目ペイロードをもとに、
 * daily_nursing_evaluation の b_items および b_score を算出して更新します。
 */
export async function mapBItemsFromHFile(recordId: number): Promise<void> {
  const db = await getDB();
  
  // HファイルからASS0021（B項目）の生データを取得
  // payload_data は配列 ["0", "1", ...] であると想定
  const hRecordsResult = await db.query<{
    patient_no: string;
    eval_date: string;
    payload_data: string[];
  }>(
    `SELECT patient_no, eval_date::text as eval_date, payload_data 
     FROM h_record 
     WHERE record_id = $1 AND payload_type = 'ASS0021'`,
    [recordId]
  );

  const chunkSize = 500;
  let updateQueries: string[] = [];
  let params: any[] = [];
  let paramIndex = 1;

  for (const row of hRecordsResult.rows) {
    const payload = row.payload_data;
    if (!payload || payload.length < 11) continue;

    const v = payload.map(Number); // 0-indexed array of numbers
    
    // 得点計算（ビジネスルール3-5-2）
    const scoreB1 = v[0]; // 寝返り
    const scoreB2 = v[1] * v[7]; // 移乗（状態 × 介助）
    const scoreB3 = v[2] * v[8]; // 口腔清潔（状態 × 介助）
    const scoreB4 = v[3] * v[9]; // 食事摂取（状態 × 介助）
    const scoreB5 = v[4] * v[10]; // 衣服の着脱（状態 × 介助）
    const scoreB6 = v[5]; // 指示が通じる
    const scoreB7 = v[6] * 2; // 危険行動

    const bScoreTotal = scoreB1 + scoreB2 + scoreB3 + scoreB4 + scoreB5 + scoreB6 + scoreB7;

    const bItemsJson = {
      b3_turn_over: v[0],
      b6_transfer_parent: scoreB2, // 結果としての親スコア（移乗）
      b6_status: v[1],
      b6_assist: v[7],
      b8_oral_care_parent: scoreB3, // 最終結果としての親スコア（口腔清潔）
      b8_status: v[2],
      b8_assist: v[8],
      b9_meal_parent: scoreB4,
      b9_status: v[3],
      b9_assist: v[9],
      b10_clothes_parent: scoreB5,
      b10_status: v[4],
      b10_assist: v[10],
      b12_understand_instructions: v[5],
      b13_danger_behavior: v[6]
    };

    // PGliteの型解決エラー（could not determine data type of parameter $1）を防ぐため
    // 1件ずつ独立したクエリとして実行し、パラメータのインデックスを固定（$1〜$5）します。
    await db.query(
      `
      UPDATE daily_nursing_evaluation
      SET b_items = $1::jsonb, b_score = $2, updated_at = CURRENT_TIMESTAMP
      WHERE record_id = $3 
        AND patient_no = $4 
        AND eval_date = $5
      `,
      [JSON.stringify(bItemsJson), bScoreTotal, recordId, row.patient_no, row.eval_date]
    );
  }
}
