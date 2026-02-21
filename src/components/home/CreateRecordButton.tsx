'use client';

import { Plus } from 'lucide-react';

interface CreateRecordButtonProps {
  onClick: () => void;
}

export function CreateRecordButton({ onClick }: CreateRecordButtonProps) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:bg-accent-hover hover:shadow-xl hover:shadow-accent/30 active:scale-95"
    >
      <Plus size={16} className="transition-transform group-hover:rotate-90" />
      新規作成
    </button>
  );
}
