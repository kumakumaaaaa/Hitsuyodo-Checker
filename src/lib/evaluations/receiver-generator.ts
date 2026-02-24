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

  // 3. 患者情報を取得
  const patientsResult = await db.query<{ patient_no: string; admission_date: string | null; discharge_date: string | null }>(
    `SELECT patient_no, admission_date::text as admission_date, discharge_date::text as discharge_date FROM patient WHERE record_id = $1`,
    [recordId]
  );

  // 4. バルクインサート用のパラメータを構築
  const chunkSize = 1000; // パラメータ数が多くなりすぎるのを防ぐため、ある程度の固まりでINSERT
  let insertValues: string[] = [];
  let params: any[] = [];
  let paramIndex = 1;

  for (const patient of patientsResult.rows) {
    const admDate = patient.admission_date ? new Date(patient.admission_date) : new Date('2000-01-01');
    const disDate = patient.discharge_date ? new Date(patient.discharge_date) : new Date('2999-12-31');

    // 生成対象期間（レコード指定期間と、実際の入退院期間の重複する部分）
    const effectiveStart = new Date(Math.max(recordStartDate.getTime(), admDate.getTime()));
    const effectiveEnd = new Date(Math.min(recordEndDate.getTime(), disDate.getTime()));

    if (effectiveStart > effectiveEnd) continue; // 期間外の場合はスキップ

    // その患者が属する可能性のある「対象病棟の受け皿」すべてを作成
    const entries = Array.from(evaluationTypeMap.entries());
    for (const [wardCode, evalType] of entries) {
      let currentDate = new Date(effectiveStart);
      
      while (currentDate <= effectiveEnd) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        insertValues.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4})`);
        params.push(recordId, wardCode, patient.patient_no, dateStr, evalType);
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

        // 1日進める
        currentDate.setDate(currentDate.getDate() + 1);
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
