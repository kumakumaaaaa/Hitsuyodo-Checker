import type { FulfillmentStatus } from '@/types';

interface StatusBadgeProps {
  status: FulfillmentStatus;
}

const statusConfig: Record<FulfillmentStatus, { label: string; className: string }> = {
  fulfilled: {
    label: '充足',
    className: 'bg-fulfilled-bg text-fulfilled',
  },
  warning: {
    label: '要確認',
    className: 'bg-warning-bg text-warning',
  },
  unfulfilled: {
    label: '未充足',
    className: 'bg-unfulfilled-bg text-unfulfilled',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
        status === 'fulfilled' ? 'bg-fulfilled' : status === 'warning' ? 'bg-warning' : 'bg-unfulfilled'
      }`} />
      {config.label}
    </span>
  );
}
