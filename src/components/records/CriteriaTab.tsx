'use client';

import { useMemo } from 'react';
import { Building2, Users, UserCheck, Percent, Info } from 'lucide-react';
import { useRecordSessionStore } from '@/lib/store/record-session-store';
import type { RecordDetail, WardSettingDetail } from '@/types';
import type { GenIIDailyScore } from '@/types/daily-score';
import {
  getCriteriaByAdmissionType,
  getJudgmentPattern,
  type AdmissionTypeCriteria,
} from '@/lib/master-data/admission-type-data';

/* ===== 型定義 ===== */

interface WardCriteriaResult {
  wardCode: string;
  wardName: string;
  admissionTypeName: string | null;
  criteria: {
    criteriaNo: string;
    patternCode: string;
    patternLabel: string;
    totalCount: number;
    qualifyingCount: number;
    rate: number; // 0〜100
    thresholdRate: number | null;
  }[];
  totalCount: number; // 全基準共通の母数
}

/* ===== 集計ロジック ===== */

/** tarFlag が集計対象かどうか */
function isTargetRecord(score: GenIIDailyScore): boolean {
  return score.tarFlag === 0 || score.tarFlag === 1;
}

/** 判定パターンに該当するかどうか */
function meetsPattern(score: GenIIDailyScore, patternId: number): boolean {
  if (patternId === 1) return score.meetsP1;
  if (patternId === 2) return score.meetsP2;
  if (patternId === 3) return score.meetsP3;
  return false;
}

/** 病棟ごとの該当患者割合を算出 */
function computeWardResults(
  dailyScores: GenIIDailyScore[],
  wards: WardSettingDetail[],
  evaluationMethod: string,
): WardCriteriaResult[] {
  // wardCode でグルーピング
  const scoresByWard = new Map<string, GenIIDailyScore[]>();
  for (const s of dailyScores) {
    const arr = scoresByWard.get(s.wardCode) ?? [];
    arr.push(s);
    scoresByWard.set(s.wardCode, arr);
  }

  return wards.map((ward) => {
    const scores = scoresByWard.get(ward.ward_code) ?? [];
    const targetScores = scores.filter(isTargetRecord);
    const totalCount = targetScores.length;

    const admCriteria: AdmissionTypeCriteria[] = ward.admission_type_id
      ? getCriteriaByAdmissionType(ward.admission_type_id)
      : [];

    const criteria = admCriteria.map((c) => {
      const pattern = getJudgmentPattern(c.judgmentPatternId);
      const qualifyingCount = targetScores.filter((s) => meetsPattern(s, c.judgmentPatternId)).length;
      return {
        criteriaNo: c.criteriaNo,
        patternCode: pattern?.code ?? '?',
        patternLabel: pattern?.label ?? '?',
        totalCount,
        qualifyingCount,
        rate: totalCount > 0 ? (qualifyingCount / totalCount) * 100 : 0,
        thresholdRate: evaluationMethod === 'necessity_1' ? c.thresholdRate1 : c.thresholdRate2,
      };
    });

    return {
      wardCode: ward.ward_code,
      wardName: ward.ward_name,
      admissionTypeName: ward.admission_type_name,
      criteria,
      totalCount,
    };
  });
}

/* ===== コンポーネント ===== */

export function CriteriaTab({ record }: { record: RecordDetail }) {
  const dailyScores = useRecordSessionStore((s) => s.dailyScores);

  const wardResults = useMemo(() => {
    if (!dailyScores || dailyScores.length === 0) return [];
    return computeWardResults(dailyScores, record.wards, record.evaluation_method);
  }, [dailyScores, record.wards, record.evaluation_method]);

  // 全病棟合算
  const totalSummary = useMemo(() => {
    if (wardResults.length === 0) return null;

    // 全基準パターンを収集（重複除去）
    const allPatternIds = new Set<number>();
    for (const ward of record.wards) {
      if (!ward.admission_type_id) continue;
      for (const c of getCriteriaByAdmissionType(ward.admission_type_id)) {
        allPatternIds.add(c.judgmentPatternId);
      }
    }

    const allTargetScores = dailyScores?.filter(isTargetRecord) ?? [];
    const totalCount = allTargetScores.length;

    return [...allPatternIds].sort().map((pid) => {
      const pattern = getJudgmentPattern(pid);
      const qualifyingCount = allTargetScores.filter((s) => meetsPattern(s, pid)).length;
      return {
        patternCode: pattern?.code ?? '?',
        patternLabel: pattern?.label ?? '?',
        totalCount,
        qualifyingCount,
        rate: totalCount > 0 ? (qualifyingCount / totalCount) * 100 : 0,
      };
    });
  }, [wardResults, dailyScores, record.wards]);

  // データなし
  if (!dailyScores || dailyScores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <Users size={40} className="mb-4 opacity-40" />
        <p className="text-sm">スコアデータがありません</p>
        <p className="text-xs mt-1 text-text-muted">レコードを再作成してデータを読み込んでください</p>
      </div>
    );
  }

  const periodLabel = `${formatPeriod(record.period_from)} 〜 ${formatPeriod(record.period_to)}`;

  return (
    <div className="space-y-6">
      {/* ヘッダ */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">該当患者割合</h2>
          <p className="text-sm text-text-secondary mt-0.5">対象期間: {periodLabel}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted bg-surface rounded-lg px-3 py-1.5 border border-border">
          <Info size={14} />
          集計対象: 判定対象フラグ 0 または 1 のレコード
        </div>
      </div>

      {/* 病棟ごとのカード */}
      <div className="grid gap-4">
        {wardResults.map((wr) => (
          <WardCard key={wr.wardCode} result={wr} />
        ))}
      </div>

      {/* 全病棟合算 */}
      {totalSummary && totalSummary.length > 0 && (
        <div className="rounded-xl border-2 border-accent/30 bg-accent/5 p-5">
          <h3 className="text-sm font-bold text-accent mb-3 flex items-center gap-2">
            <Users size={16} />
            対象病棟合算
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {totalSummary.map((s) => (
              <div key={s.patternCode} className="rounded-lg bg-white/60 border border-accent/20 p-3">
                <div className="text-xs text-text-muted mb-1">{s.patternCode}: {s.patternLabel}</div>
                <div className="flex items-end justify-between">
                  <div className="text-xs text-text-secondary">
                    {s.qualifyingCount.toLocaleString()} / {s.totalCount.toLocaleString()}
                  </div>
                  <div className="text-2xl font-bold text-accent">{s.rate.toFixed(2)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== サブコンポーネント ===== */

function WardCard({ result }: { result: WardCriteriaResult }) {
  const hasCriteria = result.criteria.length > 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 hover:shadow-md transition-shadow">
      {/* ヘッダ行 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <Building2 size={18} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-text-primary">{result.wardName}</span>
            <span className="font-mono text-sm text-text-muted">({result.wardCode})</span>
          </div>
          <div className="mt-1.5 inline-flex items-center">
            <span className="text-xs font-bold text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-md">
              {result.admissionTypeName ?? '入院料未設定'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-text-muted bg-background rounded-md px-2 py-1">
          <Users size={12} />
          延べ {result.totalCount.toLocaleString()} 件
        </div>
      </div>

      {/* 基準ごとの行 */}
      {hasCriteria ? (
        <div className={`grid gap-3 ${result.criteria.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {result.criteria.map((c) => {
            const isWarning = c.thresholdRate !== null && c.rate < c.thresholdRate;
            let requiredCount = null;
            
            if (c.thresholdRate !== null) {
              requiredCount = Math.ceil((c.totalCount * c.thresholdRate) / 100);
            }
            
            return (
              <div
                key={c.criteriaNo}
                className={`rounded-lg border p-3 ${
                  isWarning ? 'border-danger/30 bg-danger/5' : 'border-border bg-background'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold rounded px-1.5 py-0.5 ${
                      isWarning ? 'text-danger bg-danger/10' : 'text-accent bg-accent/10'
                    }`}>
                      {c.criteriaNo}
                    </span>
                    <span className="text-xs text-text-muted truncate">
                      {c.patternCode}: {c.patternLabel}
                    </span>
                  </div>
                  {isWarning && (
                    <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                      基準未達
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <UserCheck size={12} className={isWarning ? 'text-danger' : 'text-accent'} />
                      該当: {c.qualifyingCount.toLocaleString()} 名
                      {requiredCount !== null && (
                        <span className="text-[10px] font-bold text-accent bg-accent/5 px-1.5 py-0.5 rounded ml-1 border border-accent/20">
                          要件: {requiredCount.toLocaleString()} 名
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <Users size={12} />
                      母数: {c.totalCount.toLocaleString()} 名
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${isWarning ? 'text-danger' : 'text-accent'}`}>
                      {c.rate.toFixed(2)}%
                    </div>
                  </div>
                </div>
                {/* プログレスバー */}
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isWarning ? 'bg-danger' : 'bg-accent'
                      }`}
                      style={{ width: `${Math.min(c.rate, 100)}%` }}
                    />
                  </div>
                  {c.thresholdRate !== null && (
                    <div className="flex justify-between items-center text-xs mt-1.5">
                      <span></span>
                      <span className="font-bold text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20 shadow-sm">
                        算定要件: {c.thresholdRate}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-background p-4 text-center text-sm text-text-muted">
          この入院料には判定基準が設定されていません
        </div>
      )}
    </div>
  );
}

/* ===== ヘルパー ===== */

function formatPeriod(d: string): string {
  // "2026-01-01" → "2026/01"
  const parts = d.split('-');
  return `${parts[0]}/${parts[1]}`;
}
