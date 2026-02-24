'use client';

import { useState, useEffect } from 'react';
import { getDB } from '@/lib/db';

export function DebugReceivers({ recordId }: { recordId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [counts, setCounts] = useState({ patient: 0, h_record: 0, ef_medical_act: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchReceivers() {
      setLoading(true);
      try {
        const db = await getDB();
        
        // 各テーブルの登録件数を取得
        const pCnt = await db.query<{count: string}>(`SELECT count(*) FROM patient WHERE record_id = $1`, [recordId]);
        const hCnt = await db.query<{count: string}>(`SELECT count(*) FROM h_record WHERE record_id = $1`, [recordId]);
        const efCnt = await db.query<{count: string}>(`SELECT count(*) FROM ef_medical_act WHERE record_id = $1`, [recordId]);
        
        setCounts({
          patient: parseInt(pCnt.rows[0].count, 10),
          h_record: parseInt(hCnt.rows[0].count, 10),
          ef_medical_act: parseInt(efCnt.rows[0].count, 10),
        });

        // 受け皿一覧を取得
        const res = await db.query(
          `SELECT ward_code, patient_no, eval_date::text, evaluation_type 
           FROM daily_nursing_evaluation 
           WHERE record_id = $1 
           ORDER BY ward_code, patient_no, eval_date
           LIMIT 100`,
          [recordId]
        );
        setData(res.rows);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchReceivers();
  }, [recordId]);

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden mt-6">
      <div className="border-b border-blue-100 px-5 py-3 bg-blue-100/50">
        <h3 className="text-sm font-semibold text-blue-900 flex justify-between items-center">
          <span>🛠️ デバッグ: 受信データと生成された評価票受け皿</span>
          <span className="text-xs bg-blue-200 px-2 py-0.5 rounded-full">受皿 {data.length}件表示</span>
        </h3>
      </div>
      <div className="p-4 border-b border-blue-100 bg-white/50 text-sm flex gap-6">
        <div><strong>Patient:</strong> {counts.patient}件</div>
        <div><strong>H Record:</strong> {counts.h_record}件</div>
        <div><strong>EF Medical Act:</strong> {counts.ef_medical_act}件</div>
      </div>
      <div className="p-5 overflow-auto max-h-64 text-xs font-mono">
        {loading ? (
          <p className="text-blue-500">読み込み中...</p>
        ) : data.length === 0 ? (
          <p className="text-gray-500">受け皿のデータがまだ生成されていません。</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-blue-200">
                <th className="py-1 px-2">Patient</th>
                <th className="py-1 px-2">Ward</th>
                <th className="py-1 px-2">Date</th>
                <th className="py-1 px-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-blue-100/50 hover:bg-blue-100/30">
                  <td className="py-1 px-2">{row.patient_no}</td>
                  <td className="py-1 px-2">{row.ward_code}</td>
                  <td className="py-1 px-2">{row.eval_date}</td>
                  <td className="py-1 px-2 text-blue-700 font-semibold">{row.evaluation_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
