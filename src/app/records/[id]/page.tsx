'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { recordRepository } from '@/lib/db/repositories/record-repository';
import type { RecordDetail } from '@/types';
import { DebugTab } from '@/components/records/DebugTab';
import { NursingDetailTab } from '@/components/records/NursingDetailTab';
import {
  ArrowLeft,
  Loader2,
  FileText,
  BarChart3,
  ClipboardList,
  TrendingUp,
  GitCompareArrows,
  Building2,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  getCriteriaByAdmissionType,
  getJudgmentPattern,
} from '@/lib/master-data/admission-type-data';
import { useRecordSessionStore } from '@/lib/store/record-session-store';
import type { DateRange } from '@/lib/file-parser/validate-data-period';

/* ===== タブ定義 ===== */
type TabId = 'overview' | 'criteria' | 'detail' | 'analysis' | 'compare' | 'debug';

// Extend RecordDetail with dynamic session fields locally for rendering
export type RecordDetailWithSession = RecordDetail & { sessionHDateRange?: DateRange | null, sessionEfDateRange?: DateRange | null };

const TABS: { id: TabId; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
  { id: 'overview', label: 'レコード取り込み設定', icon: <FileText size={16} /> },
  { id: 'criteria', label: '該当患者割合', icon: <BarChart3 size={16} /> },
  { id: 'detail', label: '看護必要度詳細', icon: <ClipboardList size={16} /> },
  { id: 'analysis', label: 'ABC項目別分析', icon: <TrendingUp size={16} /> },
  { id: 'compare', label: '看護必要度Ⅰ・Ⅱ比較分析', icon: <GitCompareArrows size={16} /> },
  { id: 'debug', label: 'パース結果デバッグ', icon: <span className="text-base leading-none">🐛</span> },
];

/* ===== Tab 1: レコード取り込み設定 ===== */
function OverviewTab({ record }: { record: RecordDetailWithSession }) {
  const evaluationLabel = record.evaluation_method === 'necessity_1' ? '看護必要度 Ⅰ' : '看護必要度 Ⅱ';

  return (
    <div className="space-y-6">
      {/* 基本設定 */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border px-5 py-3 bg-background">
          <h3 className="text-sm font-semibold text-text-primary">基本設定</h3>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="タイトル" value={record.title} />
            <InfoRow label="評価方式" value={evaluationLabel} accent />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow
              label="対象期間"
              value={`${record.period_from} 〜 ${record.period_to}`}
              icon={<Calendar size={12} />}
            />
            <InfoRow
              label="作成日時"
              value={record.created_at ? new Date(record.created_at).toLocaleDateString('ja-JP') : '-'}
              icon={<Clock size={12} />}
            />
          </div>
        </div>
      </div>

      {/* ファイル情報 */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border px-5 py-3 bg-background">
          <h3 className="text-sm font-semibold text-text-primary">アップロードファイル</h3>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <FileInfoCard 
              label="Hファイル" 
              filename={record.h_file_name} 
              dateRange={record.sessionHDateRange} 
            />
            <FileInfoCard 
              label="EFファイル" 
              filename={record.ef_file_name} 
              dateRange={record.sessionEfDateRange} 
            />
          </div>
        </div>
      </div>

      {/* 病棟設定 */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3 bg-background">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <Building2 size={14} className="text-text-muted" />
            病棟設定
          </h3>
          <span className="text-xs text-text-muted">{record.wards.length} 病棟</span>
        </div>
        <div className="p-5">
          {record.wards.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">病棟設定がありません</p>
          ) : (
            <div className="space-y-3">
              {record.wards.map((ward, i) => {
                const criteria = ward.admission_type_id ? getCriteriaByAdmissionType(ward.admission_type_id) : [];
                return (
                  <div key={ward.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-xs font-bold text-accent">
                        {i + 1}
                      </span>
                      <div className="flex-1 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-[11px] text-text-muted block">病棟コード</span>
                          <span className="font-mono font-medium text-text-primary">{ward.ward_code}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-text-muted block">病棟名称</span>
                          <span className="font-medium text-text-primary">{ward.ward_name || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-text-muted block">入院料</span>
                          <span className="font-medium text-text-primary">{ward.admission_type_name || '未設定'}</span>
                        </div>
                      </div>
                    </div>
                    {/* 判定パターン */}
                    {criteria.length > 0 && (
                      <div className="mt-2 ml-9 space-y-0.5">
                        {criteria.map((c) => {
                          const pattern = getJudgmentPattern(c.judgmentPatternId);
                          return (
                            <div key={c.id} className="flex items-center gap-1.5 text-[11px] text-text-muted">
                              <span className="rounded bg-accent/10 px-1.5 py-0.5 font-medium text-accent">{pattern?.code}</span>
                              <span>{c.criteriaNo}: {pattern?.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== ヘルパーコンポーネント ===== */
function InfoRow({ label, value, icon, accent }: { label: string; value: string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-text-muted flex items-center gap-1">{icon}{label}</span>
      <span className={`text-sm font-medium ${accent ? 'text-accent' : 'text-text-primary'}`}>{value}</span>
    </div>
  );
}

function FileInfoCard({ 
  label, 
  filename,
  dateRange
}: { 
  label: string; 
  filename: string | null;
  dateRange?: DateRange | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
      <FileText size={20} className="text-text-muted/50 shrink-0" />
      <div className="min-w-0">
        <span className="text-[11px] text-text-muted block">{label}</span>
        <span className="text-sm font-medium text-text-primary truncate block">{filename || '-'}</span>
        {dateRange && (
          <span className="text-xs text-text-muted mt-0.5 block">
            データ期間: {dateRange.minDate} 〜 {dateRange.maxDate}
          </span>
        )}
      </div>
    </div>
  );
}

/* ===== プレースホルダータブ ===== */
function PlaceholderTab({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-3 text-text-muted/30">{icon}</div>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      <p className="text-xs text-text-muted mt-1">今後のバージョンで実装予定です</p>
    </div>
  );
}

/* ===== メインページ ===== */
export default function RecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recordId = Number(params.id);

  // Zustand Session Store から今回アップロードしたファイルの解析データを取得
  // （直接詳細画面を開いた場合などはnullになる）
  const sessionRecordId = useRecordSessionStore((s) => s.recordId);
  const sessionHDateRange = useRecordSessionStore((s) => s.hDateRange);
  const sessionEfDateRange = useRecordSessionStore((s) => s.efDateRange);

  const [record, setRecord] = useState<RecordDetailWithSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    async function load() {
      try {
        const data = await recordRepository.findByIdWithWards(recordId);
        
        // 取得したレコードIDが、現在Session Storeに保持されている作成直後のレコードIDと一致すればデータを紐付ける
        const isFromCurrentSession = sessionRecordId === data?.id;

        setRecord(data ? {
          ...data,
          sessionHDateRange: isFromCurrentSession ? sessionHDateRange : null,
          sessionEfDateRange: isFromCurrentSession ? sessionEfDateRange : null,
        } : null);
      } catch (error) {
        console.error('レコードの読み込みに失敗しました:', error);
      } finally {
        setIsLoading(false);
      }
    }
    if (recordId) load();
  }, [recordId]);

  const isCompareDisabled = record?.evaluation_method !== 'necessity_1';

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />

      <main className="flex-1 flex flex-col min-h-0 mx-auto w-full max-w-7xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 flex-1">
            <Loader2 size={32} className="animate-spin text-accent mb-3" />
            <p className="text-sm text-text-secondary">読み込み中...</p>
          </div>
        ) : !record ? (
          <div className="flex flex-col items-center justify-center py-32 flex-1">
            <AlertTriangle size={32} className="text-text-muted/40 mb-3" />
            <p className="text-sm font-medium text-text-secondary">レコードが見つかりません</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 text-sm text-accent hover:underline"
            >
              ホームに戻る
            </button>
          </div>
        ) : (
          <>
            {/* レコードヘッダー（完全固定表示） */}
            <div className="shrink-0 bg-background border-b border-border px-4 sm:px-6 py-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors mb-2"
              >
                <ArrowLeft size={16} />
                レコード一覧に戻る
              </button>
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-xl font-bold text-text-primary">{record.title}</h1>
                  <p className="mt-0.5 text-sm text-text-muted">
                    {record.period_from} 〜 {record.period_to} ・ {record.wards.length} 病棟
                  </p>
                </div>
              </div>
            </div>

            {/* サイドバー + コンテンツ（個別スクロール） */}
            <div className="flex-1 flex min-h-0">
              {/* サイドバーナビゲーション */}
              <nav className="w-56 shrink-0 border-r border-border overflow-y-auto px-3 py-5" style={{ backgroundColor: '#f1f5f9' }}>
                <div className="space-y-1">
                  {TABS.map((tab) => {
                    const disabled = tab.id === 'compare' && isCompareDisabled;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => !disabled && setActiveTab(tab.id)}
                        disabled={disabled}
                        title={disabled ? '看護必要度Ⅰを選択された場合のみ閲覧可' : undefined}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                          isActive
                            ? 'bg-accent/10 text-accent'
                            : disabled
                              ? 'text-text-muted/30 cursor-not-allowed'
                              : 'text-text-muted hover:bg-background hover:text-text-primary'
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </nav>

              {/* コンテンツエリア */}
              <div id="record-detail-content" className={`flex-1 min-w-0 px-6 py-6 animate-slide-up ${
                activeTab === 'detail' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
              }`}>
                {activeTab === 'overview' && <OverviewTab record={record} />}
                {activeTab === 'criteria' && <PlaceholderTab title="該当患者割合" icon={<BarChart3 size={40} />} />}
                {activeTab === 'detail' && <NursingDetailTab />}
                {activeTab === 'analysis' && <PlaceholderTab title="ABC項目別分析" icon={<TrendingUp size={40} />} />}
                {activeTab === 'compare' && <PlaceholderTab title="看護必要度Ⅰ・Ⅱ比較分析" icon={<GitCompareArrows size={40} />} />}
                {activeTab === 'debug' && <DebugTab />}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
