import * as XLSX from 'xlsx';
import type { GenIIDailyScore } from '@/types/daily-score';

/**
 * GenIIDailyScore[] を Excel ファイルとしてダウンロードする。
 *
 * @param records 出力対象のスコア配列（フィルタ適用後）
 * @param fileName ファイル名（拡張子なし）
 */
export function exportToExcel(records: GenIIDailyScore[], fileName: string): void {
  // ヘッダ定義（表示名とフィールドの対応）
  const columns: { header: string; key: keyof GenIIDailyScore }[] = [
    { header: '病棟コード', key: 'wardCode' },
    { header: 'データ識別番号', key: 'patientNo' },
    { header: '退院年月日', key: 'dischargeDate' },
    { header: '入院年月日', key: 'admissionDate' },
    { header: '実施年月日', key: 'evalDate' },
    { header: '出力コード', key: 'tarFlag' },
    // A項目
    { header: 'A1 創傷処置', key: 'a1' },
    { header: 'A2 呼吸ケア', key: 'a2' },
    { header: 'A3 注射薬剤3種類以上', key: 'a3' },
    { header: 'A4 シリンジポンプ', key: 'a4' },
    { header: 'A5 輸血・血液製剤', key: 'a5' },
    { header: 'A6 専門的な治療・処置', key: 'a6' },
    { header: 'A7 緊急に入院を必要とする状態', key: 'a7' },
    { header: 'A得点', key: 'aTotal' },
    // B項目
    { header: 'B1 寝返り', key: 'b1' },
    { header: 'B2 移乗', key: 'b2' },
    { header: 'B2 介助', key: 'b2_assist' },
    { header: 'B3 口腔清潔', key: 'b3' },
    { header: 'B3 介助', key: 'b3_assist' },
    { header: 'B4 食事摂取', key: 'b4' },
    { header: 'B4 介助', key: 'b4_assist' },
    { header: 'B5 衣服の着脱', key: 'b5' },
    { header: 'B5 介助', key: 'b5_assist' },
    { header: 'B6 診療・療養上の指示が通じる', key: 'b6' },
    { header: 'B7 危険行動', key: 'b7' },
    { header: 'B得点', key: 'bTotal' },
    // C項目
    { header: 'C15 開頭手術', key: 'c15' },
    { header: 'C16 開胸手術', key: 'c16' },
    { header: 'C17 開腹手術', key: 'c17' },
    { header: 'C18 骨の手術', key: 'c18' },
    { header: 'C19 胸腔鏡・腹腔鏡', key: 'c19' },
    { header: 'C20 全身麻酔・脊椎麻酔', key: 'c20' },
    { header: 'C21-1 経皮的血管内治療', key: 'c21_1' },
    { header: 'C21-2 経皮的心筋焼灼術等', key: 'c21_2' },
    { header: 'C21-3 侵襲的な消化器治療', key: 'c21_3' },
    { header: 'C22 別に定める検査', key: 'c22' },
    { header: 'C23 別に定める手術', key: 'c23' },
    { header: 'C得点', key: 'cTotal' },
    // 判定結果
    { header: 'P1 該当', key: 'meetsP1' },
    { header: 'P2 該当', key: 'meetsP2' },
    { header: 'P3 該当', key: 'meetsP3' },
  ];

  // 行データの作成
  const rows = records.map((r) =>
    columns.map((col) => {
      const val = r[col.key];
      if (typeof val === 'boolean') return val ? '○' : '—';
      return val;
    })
  );

  // ワークシート作成
  const wsData = [columns.map((c) => c.header), ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 列幅の自動調整（ヘッダ文字数ベース）
  ws['!cols'] = columns.map((c) => ({
    wch: Math.max(c.header.length * 2, 10),
  }));

  // ワークブック作成 & ダウンロード
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '看護必要度詳細');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
