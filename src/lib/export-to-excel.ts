import * as XLSX from 'xlsx';
import type { GenIIDailyScore } from '@/types/daily-score';

/**
 * GenIIDailyScore[] を Excel ファイルとしてダウンロードする。
 * 列の並び順とヘッダ名は NursingDetailTab のテーブルと一致させる。
 *
 * @param records 出力対象のスコア配列（フィルタ適用後）
 * @param fileName ファイル名（拡張子なし）
 */
export function exportToExcel(records: GenIIDailyScore[], fileName: string): void {
  // ヘッダ定義（NursingDetailTab の COLUMNS と同じ並び順・表示名）
  const columns: { header: string; key: keyof GenIIDailyScore }[] = [
    // 患者基本情報
    { header: '病棟コード', key: 'wardCode' },
    { header: 'データ識別番号', key: 'patientNo' },
    { header: '退院年月日', key: 'dischargeDate' },
    { header: '入院年月日', key: 'admissionDate' },
    { header: '実施年月日', key: 'evalDate' },
    { header: '判定対象フラグ', key: 'tarFlag' },
    // 得点・基準（サマリー）
    { header: 'A得点', key: 'aTotal' },
    { header: 'B得点', key: 'bTotal' },
    { header: 'C得点', key: 'cTotal' },
    { header: '基準① A≧3 or C≧1', key: 'meetsP1' },
    { header: '基準② A≧2かつB≧3 or A≧3 or C≧1', key: 'meetsP2' },
    { header: '基準③ A≧1 or C≧1', key: 'meetsP3' },
    // A項目（個別）
    { header: '創傷処置', key: 'a1' },
    { header: '呼吸ケア', key: 'a2' },
    { header: '注射薬剤3種類以上', key: 'a3' },
    { header: 'シリンジポンプ', key: 'a4' },
    { header: '輸血・血液製剤', key: 'a5' },
    { header: '専門的な治療・処置', key: 'a6' },
    { header: '緊急に入院を必要とする状態', key: 'a7' },
    // B項目（個別）
    { header: '寝返り', key: 'b1' },
    { header: '移乗', key: 'b2' },
    { header: '移乗の介助', key: 'b2_assist' },
    { header: '口腔清潔', key: 'b3' },
    { header: '口腔清潔の介助', key: 'b3_assist' },
    { header: '食事摂取', key: 'b4' },
    { header: '食事摂取の介助', key: 'b4_assist' },
    { header: '衣服の着脱', key: 'b5' },
    { header: '衣服の着脱の介助', key: 'b5_assist' },
    { header: '診療・療養上の指示が通じる', key: 'b6' },
    { header: '危険行動', key: 'b7' },
    // C項目（個別）
    { header: '開頭手術', key: 'c15' },
    { header: '開胸手術', key: 'c16' },
    { header: '開腹手術', key: 'c17' },
    { header: '骨の手術', key: 'c18' },
    { header: '胸腔鏡・腹腔鏡', key: 'c19' },
    { header: '全身麻酔・脊椎麻酔', key: 'c20' },
    { header: '経皮的血管内治療', key: 'c21_1' },
    { header: '経皮的心筋焼灼術等', key: 'c21_2' },
    { header: '侵襲的な消化器治療', key: 'c21_3' },
    { header: '別に定める検査', key: 'c22' },
    { header: '別に定める手術', key: 'c23' },
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
