'use client';

import { useState } from 'react';
import { useRecordSessionStore } from '@/lib/store/record-session-store';
import { FileText, Database, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

type DebugTabId = 'h-file' | 'ef-file' | 'score-map';

export function DebugTab() {
  const [activeSubTab, setActiveSubTab] = useState<DebugTabId>('h-file');
  const hRecords = useRecordSessionStore((s) => s.hRecords);
  const efRecords = useRecordSessionStore((s) => s.efRecords);
  const dailyScores = useRecordSessionStore((s) => s.dailyScores);

  const [hPage, setHPage] = useState(1);
  const [efPage, setEfPage] = useState(1);
  const [scorePage, setScorePage] = useState(1);
  const PAGE_SIZE = 100;

  const totalHPages = Math.ceil((hRecords?.length || 0) / PAGE_SIZE);
  const totalEfPages = Math.ceil((efRecords?.length || 0) / PAGE_SIZE);
  const totalScorePages = Math.ceil((dailyScores?.length || 0) / PAGE_SIZE);

  const displayHRecords = hRecords?.slice((hPage - 1) * PAGE_SIZE, hPage * PAGE_SIZE) || [];
  const displayEfRecords = efRecords?.slice((efPage - 1) * PAGE_SIZE, efPage * PAGE_SIZE) || [];
  const displayScoreRecords = dailyScores?.slice((scorePage - 1) * PAGE_SIZE, scorePage * PAGE_SIZE) || [];

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
        {(['h-file', 'ef-file', 'score-map'] as const).map((tab) => (
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
              {tab === 'h-file' ? <FileText size={16} /> : tab === 'ef-file' ? <Database size={16} /> : <FileText size={16} />}
              {tab === 'h-file' ? 'Hファイル (HRecordEntry[])' : tab === 'ef-file' ? 'EFファイル (EfActEntry[])' : 'スコア計算結果 (GenIIDailyScore[])'}
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
                  <th className="px-3 py-2 text-left font-medium text-text-muted">ID (Col2)</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">Ward (Col1)</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">Date (Col5)</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">Type (Col6)</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">Col0-9</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">Col10-19 (Payload)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayHRecords.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-hover/50">
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.columns[2]}</td>
                    <td className="px-3 py-1.5 font-mono">{r.columns[1]}</td>
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
      ) : activeSubTab === 'ef-file' ? (
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
      ) : activeSubTab === 'score-map' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">先頭100件ずつ表示しています</p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">
                ページ {scorePage} / {totalScorePages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setScorePage(scorePage - 1)}
                  disabled={scorePage === 1}
                  className="p-1.5 rounded-md border border-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setScorePage(scorePage + 1)}
                  disabled={scorePage >= totalScorePages}
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
                  <th className="px-3 py-2 text-left font-medium text-text-muted">a1</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">a2</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">a3</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">a4</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">a5</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">a6</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">a7</th>
                  <th className="px-3 py-2 text-left font-medium text-accent">aTotal</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">b1</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">b2(x助)</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">b3(x助)</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">b4(x助)</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">b5(x助)</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">b6</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">b7</th>
                  <th className="px-3 py-2 text-left font-medium text-accent">bTotal</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">c15</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">c16</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">c17</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">c18</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">c19</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">c20</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">c21-1</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">c21-2</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">c21-3</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">c22</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">c23</th>
                  <th className="px-3 py-2 text-left font-medium text-accent">cTotal</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">tarFlag</th>
                  <th className="px-3 py-2 text-left font-medium text-text-muted">isTarget</th>
                  <th className="px-3 py-2 text-left font-medium text-accent">meetsP1</th>
                  <th className="px-3 py-2 text-left font-medium text-accent">meetsP2</th>
                  <th className="px-3 py-2 text-left font-medium text-accent">meetsP3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayScoreRecords.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-hover/50">
                    <td className="px-3 py-1.5 font-mono">{r.patientNo}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.evalDate}</td>
                    <td className="px-3 py-1.5">{r.a1}</td>
                    <td className="px-3 py-1.5">{r.a2}</td>
                    <td className="px-3 py-1.5">{r.a3}</td>
                    <td className="px-3 py-1.5">{r.a4}</td>
                    <td className="px-3 py-1.5">{r.a5}</td>
                    <td className="px-3 py-1.5">{r.a6}</td>
                    <td className="px-3 py-1.5">{r.a7}</td>
                    <td className="px-3 py-1.5 font-bold text-accent">{r.aTotal}</td>
                    <td className="px-3 py-1.5">{r.b1}</td>
                    <td className="px-3 py-1.5">{r.b2} <span className="text-text-muted text-[10px]">(x{r.b2_assist})</span></td>
                    <td className="px-3 py-1.5">{r.b3} <span className="text-text-muted text-[10px]">(x{r.b3_assist})</span></td>
                    <td className="px-3 py-1.5">{r.b4} <span className="text-text-muted text-[10px]">(x{r.b4_assist})</span></td>
                    <td className="px-3 py-1.5">{r.b5} <span className="text-text-muted text-[10px]">(x{r.b5_assist})</span></td>
                    <td className="px-3 py-1.5">{r.b6}</td>
                    <td className="px-3 py-1.5">{r.b7}</td>
                    <td className="px-3 py-1.5 font-bold text-accent">{r.bTotal}</td>
                    <td className="px-3 py-1.5">{r.c15}</td>
                    <td className="px-3 py-1.5">{r.c16}</td>
                    <td className="px-3 py-1.5">{r.c17}</td>
                    <td className="px-3 py-1.5">{r.c18}</td>
                    <td className="px-3 py-1.5">{r.c19}</td>
                    <td className="px-3 py-1.5">{r.c20}</td>
                    <td className="px-3 py-1.5">{r.c21_1}</td>
                    <td className="px-3 py-1.5">{r.c21_2}</td>
                    <td className="px-3 py-1.5">{r.c21_3}</td>
                    <td className="px-3 py-1.5">{r.c22}</td>
                    <td className="px-3 py-1.5">{r.c23}</td>
                    <td className="px-3 py-1.5 font-bold text-accent">{r.cTotal}</td>
                    <td className="px-3 py-1.5 font-mono">{r.tarFlag}</td>
                    <td className="px-3 py-1.5">
                      {r.isTargetForEval ? (
                        <span className="text-success font-bold">Yes</span>
                      ) : (
                        <span className="text-text-muted">No</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      {r.meetsP1 ? <span className="text-accent font-bold">Yes</span> : <span className="text-text-muted">No</span>}
                    </td>
                    <td className="px-3 py-1.5">
                      {r.meetsP2 ? <span className="text-accent font-bold">Yes</span> : <span className="text-text-muted">No</span>}
                    </td>
                    <td className="px-3 py-1.5">
                      {r.meetsP3 ? <span className="text-accent font-bold">Yes</span> : <span className="text-text-muted">No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
