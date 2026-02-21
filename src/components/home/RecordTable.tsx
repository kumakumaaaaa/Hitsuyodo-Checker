'use client';

import { useState } from 'react';
import { Trash2, Calendar, Building2, AlertCircle } from 'lucide-react';
import type { RecordListItem } from '@/types';
import { StatusBadge } from './StatusBadge';

interface RecordTableProps {
  records: RecordListItem[];
  onDelete: (id: number) => void;
  onRowClick: (id: number) => void;
}

export function RecordTable({ records, onDelete, onRowClick }: RecordTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatPeriod(from: string, to: string): string {
    const f = new Date(from);
    const t = new Date(to);
    return `${f.getFullYear()}/${String(f.getMonth() + 1).padStart(2, '0')} 〜 ${t.getFullYear()}/${String(t.getMonth() + 1).padStart(2, '0')}`;
  }

  function handleDeleteClick(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setDeleteTarget(id);
  }

  function confirmDelete() {
    if (deleteTarget !== null) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface/80">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                タイトル
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                対象期間
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">
                病棟数
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                作成日
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                充足状況
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {records.map((record, index) => (
              <tr
                key={record.id}
                onClick={() => onRowClick(record.id)}
                className="animate-slide-up cursor-pointer transition-colors hover:bg-surface-hover"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
              >
                <td className="px-5 py-4">
                  <span className="text-sm font-medium text-text-primary">
                    {record.title}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <Calendar size={13} className="text-text-muted" />
                    {formatPeriod(record.period_from, record.period_to)}
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="inline-flex items-center gap-1 text-sm text-text-secondary">
                    <Building2 size={13} className="text-text-muted" />
                    {record.ward_count}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm text-text-secondary">
                    {formatDate(record.created_at)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={record.fulfillment_status} />
                </td>
                <td className="px-5 py-4 text-center">
                  <button
                    onClick={(e) => handleDeleteClick(e, record.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    title="削除"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 削除確認ダイアログ */}
      {deleteTarget !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="absolute inset-0 bg-modal-overlay animate-fade-in" />
          <div
            className="animate-scale-in relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10">
              <AlertCircle size={24} className="text-danger" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-text-primary">
              レコードを削除しますか?
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-text-secondary">
              この操作は元に戻せません。レコードに関連するすべてのデータが完全に削除されます。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                キャンセル
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-danger-hover"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
