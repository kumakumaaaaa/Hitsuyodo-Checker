import { getDB } from '../db';
import { resolveEvaluationType } from './evaluation-type-resolver';
import type { EvaluationType } from '../master-data/admission-type-data';

/**
 * レコード内でパースされたすべての患者（patient）と病棟設定（ward_setting）に対して、
 * 対象期間分だけの日次評価「受け皿（daily_nursing_evaluation）」を一括生成します。
 *
 * @param recordId 対象のレコードID
 * @throws 評価票種別の判定エラーやDBエラー時にスロー
 */
export async function generateEvaluationReceivers(recordId: number): Promise<void> {
  const db = await getDB();

  // 1. レコード情報と病棟設定を取得
  const recordResult = await db.query<{
    period_from: string;
    period_to: string;
    evaluation_method: string;
  }>(
    `SELECT period_from::text as period_from, period_to::text as period_to, evaluation_method FROM record WHERE id = $1`,
    [recordId]
  );
  if (recordResult.rows.length === 0) {
    throw new Error(`レコード(ID: ${recordId})が見つかりません。`);
  }
  
  const { period_from, period_to, evaluation_method } = recordResult.rows[0];
  const recordStartDate = new Date(period_from);
  
  // yyyy-mm-dd 指定された月の末日までを対象とするように修正（period_toはそのまま使うか、1ヶ月後から1日引く）
  // 画面入力では periodFrom, periodToは先頭日付が入っている（例：10月分は periodFrom: '2024-10-01', periodTo: '2024-11-01'）
  const periodToDate = new Date(period_to);
  // periodTo（翌月1日）の1日前を期間末日とする
  const recordEndDate = new Date(periodToDate.getTime() - 24 * 60 * 60 * 1000);

  // 2. 病棟設定とそれに基づく評価票種別をマッピング
  const wardSettingsResult = await db.query<{ ward_code: string; admission_type_id: number | null }>(
    `SELECT ward_code, admission_type_id FROM ward_setting WHERE record_id = $1`,
    [recordId]
  );
  
  const evaluationTypeMap = new Map<string, EvaluationType>();
  for (const w of wardSettingsResult.rows) {
    const evalType = resolveEvaluationType(
      evaluation_method as 'necessity_1' | 'necessity_2',
      w.admission_type_id
    );
    evaluationTypeMap.set(w.ward_code, evalType);
  }

  // 3. h_record に存在する患者と日付の組み合わせを取得（Hファイルベース）
  const hDistResult = await db.query<{ patient_no: string; eval_date: string }>(
    `SELECT DISTINCT patient_no, eval_date::text as eval_date FROM h_record WHERE record_id = $1`,
    [recordId]
  );

  // 4. バルクインサート用のパラメータを構築
  const chunkSize = 1000; // パラメータ数が多くなりすぎるのを防ぐため、ある程度の固まりでINSERT
  let insertValues: string[] = [];
  let params: any[] = [];
  let paramIndex = 1;

  const entries = Array.from(evaluationTypeMap.entries());

  for (const row of hDistResult.rows) {
    const evalDateObj = new Date(row.eval_date);
    
    // 念のため、ユーザーが指定した対象期間外のデータは受け皿を作らないようにフィルタリング
    if (evalDateObj < recordStartDate || evalDateObj > recordEndDate) {
      continue;
    }

    // その患者・日付に対して、対象病棟の受け皿をすべて作成
    for (const [wardCode, evalType] of entries) {
      insertValues.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4})`);
      params.push(recordId, wardCode, row.patient_no, row.eval_date, evalType);
      paramIndex += 5;

      // チャンクサイズに達したらINSERT実行して初期化
      if (insertValues.length >= chunkSize) {
        const query = `
          INSERT INTO daily_nursing_evaluation 
            (record_id, ward_code, patient_no, eval_date, evaluation_type)
          VALUES ${insertValues.join(', ')}
          ON CONFLICT (record_id, ward_code, patient_no, eval_date) DO NOTHING
        `;
        await db.query(query, params);
        
        insertValues = [];
        params = [];
        paramIndex = 1;
      }
    }
  }

  // 残りのデータをINSERT
  if (insertValues.length > 0) {
    const query = `
      INSERT INTO daily_nursing_evaluation 
        (record_id, ward_code, patient_no, eval_date, evaluation_type)
      VALUES ${insertValues.join(', ')}
      ON CONFLICT (record_id, ward_code, patient_no, eval_date) DO NOTHING
    `;
    await db.query(query, params);
  }
}
