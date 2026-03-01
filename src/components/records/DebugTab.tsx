'use client';

import { useState } from 'react';
import { useRecordSessionStore } from '@/lib/store/record-session-store';
import { FileText, Database, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

type DebugTabId = 'h-file' | 'ef-file';

export function DebugTab() {
  const [activeSubTab, setActiveSubTab] = useState<DebugTabId>('h-file');
  const hRecords = useRecordSessionStore((s) => s.hRecords);
  const efRecords = useRecordSessionStore((s) => s.efRecords);

  const [hPage, setHPage] = useState(1);
  const [efPage, setEfPage] = useState(1);
  const PAGE_SIZE = 100;

  const totalHPages = Math.ceil((hRecords?.length || 0) / PAGE_SIZE);
  const totalEfPages = Math.ceil((efRecords?.length || 0) / PAGE_SIZE);

  const displayHRecords = hRecords?.slice((hPage - 1) * PAGE_SIZE, hPage * PAGE_SIZE) || [];
  const displayEfRecords = efRecords?.slice((efPage - 1) * PAGE_SIZE, efPage * PAGE_SIZE) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <span className="text-xl">🐛</span> パース結果デバッグ
          </h2>
          <p className="text-sm text-text-muted mt-1">
            メモリ上に保持されている {hRecords?.length ? 'Hファイル' : 'ファイル'} のパース結果を確認できます（リロードで消滅します）
          </p>
        </div>
        <div className="flex gap-4">
          <div className="rounded-lg bg-surface border border-border px-4 py-2 flex flex-col items-center">
            <span className="text-xs text-text-muted">Hファイル</span>
            <span className="text-lg font-bold text-accent">{hRecords?.length?.toLocaleString() ?? 0}</span>
          </div>
          <div className="rounded-lg bg-surface border border-border px-4 py-2 flex flex-col items-center">
            <span className="text-xs text-text-muted">EFファイル</span>
            <span className="text-lg font-bold text-accent">{efRecords?.length?.toLocaleString() ?? 0}</span>
          </div>
        </div>
      </div>

      {/* サブタブ切り替え */}
      <div className="flex border-b border-border">
        {(['h-file', 'ef-file'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === tab
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center gap-2">
              {tab === 'h-file' ? <FileText size={16} /> : <Database size={16} />}
              {tab === 'h-file' ? 'Hファイル (HRecordEntry[])' : 'EFファイル (EfActEntry[])'}
            </div>
          </button>
        ))}
      </div>

      {!hRecords && !efRecords ? (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle size={32} className="text-warning mb-3" />
          <p className="text-sm font-medium text-warning">データがありません</p>
          <p className="text-xs text-warning/70 mt-1">
            新規登録フローからパース処理を実行してください。<br/>
            画面をリロードした場合はメモリから揮発するため再登録が必要です。
          </p>
        </div>
      ) : activeSubTab === 'h-file' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">先頭100件ずつ表示しています</p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">
                ページ {hPage} / {totalHPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setHPage(hPage - 1)}
                  disabled={hPage === 1}
                  className="p-1.5 rounded-md border border-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setHPage(hPage + 1)}
                  disabled={hPage >= totalHPages}
                  className="p-1.5 rounded-md border border-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="min-w-full divide-y divide-border text-xs">
              <thead className="bg-background">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">ID (Col1)</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">Date (Col5)</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">Type (Col6)</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">Col0-9</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">Col10-19 (Payload)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayHRecords.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-hover/50">
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.columns[1]}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.columns[5]}</td>
                    <td className="px-3 py-1.5 font-mono text-accent">{r.columns[6]}</td>
                    <td className="px-3 py-1.5 font-mono max-w-[200px] truncate" title={r.columns.slice(0, 10).join('|')}>
                      {r.columns.slice(0, 10).join('|')}
                    </td>
                    <td className="px-3 py-1.5 font-mono max-w-[200px] truncate" title={r.columns.slice(10, 20).join('|')}>
                      {r.columns.slice(10, 20).join('|')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">先頭100件ずつ表示しています</p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">
                ページ {efPage} / {totalEfPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setEfPage(efPage - 1)}
                  disabled={efPage === 1}
                  className="p-1.5 rounded-md border border-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setEfPage(efPage + 1)}
                  disabled={efPage >= totalEfPages}
                  className="p-1.5 rounded-md border border-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="min-w-full divide-y divide-border text-xs">
              <thead className="bg-background">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">patientNo</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">evalDate</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">wardCode/Type</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">category</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">receiptCode</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">detailCat</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">admit/discharge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayEfRecords.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-hover/50">
                    <td className="px-3 py-1.5 font-mono">{r.patientNo}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.evalDate}</td>
                    <td className="px-3 py-1.5">{r.wardCode} <span className="text-text-muted">({r.wardType})</span></td>
                    <td className="px-3 py-1.5">
                      <span className="px-1.5 py-0.5 rounded-full bg-surface-hover border border-border">
                        {r.dataCategory}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-accent">{r.receiptCode}</td>
                    <td className="px-3 py-1.5 font-mono">{r.detailCategory || '-'}</td>
                    <td className="px-3 py-1.5 text-text-muted">
                      {r.admissionDate} - {r.dischargeDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
