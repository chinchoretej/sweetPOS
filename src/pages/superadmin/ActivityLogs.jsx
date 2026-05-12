import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import { CardSkeleton } from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';
import { subscribeRecentActivity } from '../../services/activityLogService';
import { friendlyDate } from '../../utils/format';

const TYPE_TONE = {
  'shop.created': 'success',
  'shop.updated': 'info',
  'shop.archived': 'warning',
  'shop.status_changed': 'warning',
  'shop.deleted': 'danger',
  'subscription.changed': 'info',
  'subscription.status_changed': 'warning',
  'feature_flag.toggled': 'info',
  'feature_flag.bulk_set': 'info',
  'employee.invited': 'success',
  'employee.removed': 'danger',
  'shop.migrated': 'success',
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = subscribeRecentActivity(200, (l) => {
      setLogs(l);
      setLoading(false);
    });
    return () => u && u();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-display font-bold">Platform Activity</h2>
        <p className="text-sm text-slate-500">Audit trail across all shops.</p>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : logs.length === 0 ? (
        <EmptyState icon={<Activity className="w-10 h-10" />} title="No activity yet" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3 text-left">When</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Shop</th>
                  <th className="px-4 py-3 text-left">Actor</th>
                  <th className="px-4 py-3 text-left">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {friendlyDate(l.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={TYPE_TONE[l.type] || 'default'}>{l.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <code className="text-[11px]">{l.shopId?.slice(0, 8) || '—'}…</code>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <code className="text-[11px]">{l.actorUid?.slice(0, 8) || '—'}…</code>
                    </td>
                    <td className="px-4 py-3">{l.summary}</td>
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
