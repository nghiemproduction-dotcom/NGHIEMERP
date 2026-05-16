import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: number;
  alert?: boolean;
}

export default function StatCard({ label, value, sub, icon: Icon, iconColor = 'text-blue-600', trend, alert }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${alert ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
          <p className={`mt-1 text-xl font-bold truncate ${alert ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400 truncate">{sub}</p>}
          {trend !== undefined && (
            <p className={`mt-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend >= 0 ? '+' : ''}{trend}% vs trước
            </p>
          )}
        </div>
        <div className={`flex-shrink-0 ml-3 p-2 rounded-lg ${alert ? 'bg-red-100' : 'bg-gray-50'}`}>
          <Icon className={`w-5 h-5 ${alert ? 'text-red-600' : iconColor}`} />
        </div>
      </div>
    </div>
  );
}
