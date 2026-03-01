'use client';

import { useState, useMemo } from 'react';
import { useRecordSessionStore } from '@/lib/store/record-session-store';
import { exportToExcel } from '@/lib/export-to-excel';
import { ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';
import type { GenIIDailyScore } from '@/types/daily-score';

const PAGE_SIZE = 100;

/** テーブル列定義 */
const COLUMNS: { header: string; shortHeader?: string; key: keyof GenIIDailyScore; group: string; isTotal?: boolean }[] = [
  // 患者基本情報
  { header: '病棟コード', key: 'wardCode', group: 'info' },
  { header: 'データ識別番号', key: 'patientNo', group: 'info' },
  { header: '退院年月日', key: 'dischargeDate', group: 'info' },
  { header: '入院年月日', key: 'admissionDate', group: 'info' },
  { header: '実施年月日', key: 'evalDate', group: 'info' },
  { header: '出力コード', key: 'tarFlag', group: 'info' },
  // A項目
  { header: 'A1 創傷処置', shortHeader: 'A1', key: 'a1', group: 'a' },
  { header: 'A2 呼吸ケア', shortHeader: 'A2', key: 'a2', group: 'a' },
  { header: 'A3 注射薬剤3種類以上', shortHeader: 'A3', key: 'a3', group: 'a' },
  { header: 'A4 シリンジポンプ', shortHeader: 'A4', key: 'a4', group: 'a' },
  { header: 'A5 輸血・血液製剤', shortHeader: 'A5', key: 'a5', group: 'a' },
  { header: 'A6 専門的な治療・処置', shortHeader: 'A6', key: 'a6', group: 'a' },
  { header: 'A7 緊急に入院を必要とする状態', shortHeader: 'A7', key: 'a7', group: 'a' },
  { header: 'A得点', key: 'aTotal', group: 'a', isTotal: true },
  // B項目
  { header: 'B1 寝返り', shortHeader: 'B1', key: 'b1', group: 'b' },
  { header: 'B2 移乗', shortHeader: 'B2', key: 'b2', group: 'b' },
  { header: 'B2 介助', shortHeader: 'B2助', key: 'b2_assist', group: 'b' },
  { header: 'B3 口腔清潔', shortHeader: 'B3', key: 'b3', group: 'b' },
  { header: 'B3 介助', shortHeader: 'B3助', key: 'b3_assist', group: 'b' },
  { header: 'B4 食事摂取', shortHeader: 'B4', key: 'b4', group: 'b' },
  { header: 'B4 介助', shortHeader: 'B4助', key: 'b4_assist', group: 'b' },
  { header: 'B5 衣服の着脱', shortHeader: 'B5', key: 'b5', group: 'b' },
  { header: 'B5 介助', shortHeader: 'B5助', key: 'b5_assist', group: 'b' },
  { header: 'B6 診療・療養上の指示が通じる', shortHeader: 'B6', key: 'b6', group: 'b' },
  { header: 'B7 危険行動', shortHeader: 'B7', key: 'b7', group: 'b' },
  { header: 'B得点', key: 'bTotal', group: 'b', isTotal: true },
  // C項目
  { header: 'C15 開頭手術', shortHeader: 'C15', key: 'c15', group: 'c' },
  { header: 'C16 開胸手術', shortHeader: 'C16', key: 'c16', group: 'c' },
  { header: 'C17 開腹手術', shortHeader: 'C17', key: 'c17', group: 'c' },
  { header: 'C18 骨の手術', shortHeader: 'C18', key: 'c18', group: 'c' },
  { header: 'C19 胸腔鏡・腹腔鏡', shortHeader: 'C19', key: 'c19', group: 'c' },
  { header: 'C20 全身麻酔・脊椎麻酔', shortHeader: 'C20', key: 'c20', group: 'c' },
  { header: 'C21-1 経皮的血管内治療', shortHeader: 'C21-1', key: 'c21_1', group: 'c' },
  { header: 'C21-2 経皮的心筋焼灼術等', shortHeader: 'C21-2', key: 'c21_2', group: 'c' },
  { header: 'C21-3 侵襲的な消化器治療', shortHeader: 'C21-3', key: 'c21_3', group: 'c' },
  { header: 'C22 別に定める検査', shortHeader: 'C22', key: 'c22', group: 'c' },
  { header: 'C23 別に定める手術', shortHeader: 'C23', key: 'c23', group: 'c' },
  { header: 'C得点', key: 'cTotal', group: 'c', isTotal: true },
  // 判定結果
  { header: 'P1 該当', key: 'meetsP1', group: 'p' },
  { header: 'P2 該当', key: 'meetsP2', group: 'p' },
  { header: 'P3 該当', key: 'meetsP3', group: 'p' },
];

/** グループヘッダの色と名称 */
const GROUP_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  info: { label: '患者基本情報', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  a: { label: 'A項目', bg: 'bg-rose-50', text: 'text-rose-700' },
  b: { label: 'B項目', bg: 'bg-sky-50', text: 'text-sky-700' },
  c: { label: 'C項目', bg: 'bg-amber-50', text: 'text-amber-700' },
  p: { label: '基準患者', bg: 'bg-violet-50', text: 'text-violet-700' },
};

/** 日付をYYYY/MM/DD形式に変換 */
function formatDate(d: string): string {
  if (!d || d === '00000000') return '—';
  return `${d.slice(0, 4)}/${d.slice(4, 6)}/${d.slice(6, 8)}`;
}

export function NursingDetailTab() {
  const dailyScores = useRecordSessionStore((s) => s.dailyScores);

  // フィルタ
  const [wardFilter, setWardFilter] = useState<string>('');
  const [patientFilter, setPatientFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  // 病棟コードのユニーク一覧
  const wardCodes = useMemo(() => {
    if (!dailyScores) return [];
    return [...new Set(dailyScores.map((r) => r.wardCode))].sort();
  }, [dailyScores]);

  // フィルタ適用後のデータ
  const filteredRecords = useMemo(() => {
    if (!dailyScores) return [];
    return dailyScores.filter((r) => {
      if (wardFilter && r.wardCode !== wardFilter) return false;
      if (patientFilter && !r.patientNo.includes(patientFilter)) return false;
      return true;
    });
  }, [dailyScores, wardFilter, patientFilter]);

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const displayRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ページリセット
  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  // Excel出力
  const handleExport = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    exportToExcel(filteredRecords, `看護必要度詳細_${dateStr}`);
  };

  // セルの値表示
  const renderCell = (record: GenIIDailyScore, col: typeof COLUMNS[number], _rowIndex: number) => {
    const val = record[col.key];

    // boolean → ○/—
    if (typeof val === 'boolean') {
      return val
        ? <span className="text-accent font-bold">○</span>
        : <span className="text-text-muted">—</span>;
    }

    // 日付フォーマット
    if (['evalDate', 'admissionDate', 'dischargeDate'].includes(col.key)) {
      return <span className="whitespace-nowrap">{formatDate(String(val))}</span>;
    }

    // 合計列のスタイル
    if (col.isTotal) {
      return <span className="font-bold text-accent">{val}</span>;
    }

    return val;
  };

  // 行の背景色（P1/P2/P3 該当時ハイライト）
  const getRowBg = (r: GenIIDailyScore): string => {
    if (!r.isTargetForEval) return 'bg-surface-hover/30';
    if (r.meetsP1) return 'bg-rose-50/60';
    if (r.meetsP2) return 'bg-sky-50/60';
    if (r.meetsP3) return 'bg-emerald-50/60';
    return '';
  };

  // グループヘッダの計算
  const groupHeaders = useMemo(() => {
    const groups: { group: string; span: number }[] = [];
    let current = '';
    for (const col of COLUMNS) {
      if (col.group !== current) {
        groups.push({ group: col.group, span: 1 });
        current = col.group;
      } else {
        groups[groups.length - 1].span++;
      }
    }
    return groups;
  }, []);

  if (!dailyScores || dailyScores.length === 0) {
    return (
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-6 flex flex-col items-center justify-center text-center">
        <span className="text-3xl mb-3">📋</span>
        <p className="text-sm font-medium text-warning">データがありません</p>
        <p className="text-xs text-warning/70 mt-1">
          新規登録フローからファイルを取り込んでください。<br />
          画面をリロードした場合はメモリから揮発するため再登録が必要です。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ヘッダエリア: フィルタ + アクション */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* フィルタ */}
        <div className="flex items-center gap-3">
          <Filter size={16} className="text-text-muted" />
          <select
            value={wardFilter}
            onChange={(e) => handleFilterChange(setWardFilter, e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="">全病棟</option>
            {wardCodes.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="データ識別番号で検索..."
            value={patientFilter}
            onChange={(e) => handleFilterChange(setPatientFilter, e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        {/* 件数 + Excel出力 + ページネーション */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-muted font-medium">
            {filteredRecords.length.toLocaleString()} 件
          </span>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Download size={14} />
            Excel出力
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              {page} / {totalPages || 1}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-md border border-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md border border-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full divide-y divide-border text-xs">
          <thead className="bg-background">
            {/* グループヘッダ行 */}
            <tr>
              <th className="px-2 py-1.5 text-center font-medium text-text-muted border-r border-border" rowSpan={2}>#</th>
              {groupHeaders.map((g) => {
                const style = GROUP_STYLES[g.group];
                return (
                  <th
                    key={g.group}
                    colSpan={g.span}
                    className={`px-2 py-1.5 text-center font-bold border-r border-border ${style.bg} ${style.text}`}
                  >
                    {style.label}
                  </th>
                );
              })}
            </tr>
            {/* 個別列ヘッダ行 */}
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`px-2 py-1.5 text-center font-medium text-text-muted border-r border-border whitespace-nowrap ${
                    col.isTotal ? 'bg-accent/5 text-accent font-bold' : ''
                  }`}
                  title={col.header}
                >
                  {col.shortHeader || col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayRecords.map((r, i) => {
              const rowNum = (page - 1) * PAGE_SIZE + i + 1;
              return (
                <tr key={`${r.patientNo}_${r.evalDate}_${i}`} className={`hover:bg-surface-hover/50 ${getRowBg(r)}`}>
                  <td className="px-2 py-1 text-center text-text-muted border-r border-border font-mono">{rowNum}</td>
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`px-2 py-1 text-center border-r border-border ${
                        col.group === 'info' ? 'font-mono' : ''
                      } ${col.isTotal ? 'font-bold text-accent' : ''}`}
                    >
                      {renderCell(r, col, i)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
