import { FilePlus2 } from 'lucide-react';

interface EmptyStateProps {
  onCreateClick: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="animate-slide-up flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
        <FilePlus2 size={28} className="text-accent" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-text-primary">
        レコードがありません
      </h3>
      <p className="mb-6 max-w-sm text-sm leading-relaxed text-text-secondary">
        HファイルとEFファイルをアップロードして、看護必要度の集計・分析を開始しましょう。
      </p>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30 active:scale-95"
      >
        <FilePlus2 size={16} />
        最初のレコードを作成する
      </button>
    </div>
  );
}
