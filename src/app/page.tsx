'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { RecordTable } from '@/components/home/RecordTable';
import { CreateRecordButton } from '@/components/home/CreateRecordButton';
import { EmptyState } from '@/components/home/EmptyState';
import { recordRepository } from '@/lib/db/repositories/record-repository';
import { seedDatabase } from '@/lib/db/seed';
import type { RecordListItem } from '@/types';
import { Loader2, Database } from 'lucide-react';

export default function HomePage() {
  const [records, setRecords] = useState<RecordListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadRecords = useCallback(async () => {
    try {
      const data = await recordRepository.findAll();
      setRecords(data);
    } catch (error) {
      console.error('レコードの読み込みに失敗しました:', error);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        await seedDatabase();
        setIsInitialized(true);
        await loadRecords();
      } catch (error) {
        console.error('データベースの初期化に失敗しました:', error);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [loadRecords]);

  const handleDelete = async (id: number) => {
    try {
      await recordRepository.delete(id);
      await loadRecords();
    } catch (error) {
      console.error('レコードの削除に失敗しました:', error);
    }
  };

  const router = useRouter();

  const handleRowClick = (id: number) => {
    router.push(`/records/${id}`);
  };

  const handleCreateClick = () => {
    router.push('/records/new');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative mb-4">
              <Database size={32} className="text-accent/30" />
              <Loader2 size={20} className="absolute -right-1 -top-1 animate-spin text-accent" />
            </div>
            <p className="text-sm text-text-secondary">データベースを初期化中...</p>
          </div>
        ) : (
          <>
            {/* ページヘッダー */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-text-primary">レコード一覧</h1>
                <p className="mt-1 text-sm text-text-muted">
                  {records.length > 0
                    ? `${records.length} 件のレコード`
                    : 'HファイルとEFファイルをアップロードして分析を開始'}
                </p>
              </div>
              {records.length > 0 && (
                <CreateRecordButton onClick={handleCreateClick} />
              )}
            </div>

            {/* コンテンツ */}
            {records.length > 0 ? (
              <RecordTable
                records={records}
                onDelete={handleDelete}
                onRowClick={handleRowClick}
              />
            ) : (
              <EmptyState onCreateClick={handleCreateClick} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
