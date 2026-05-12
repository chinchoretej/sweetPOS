import { useEffect, useState } from 'react';
import { Plus, Trash2, UserPlus, Lock } from 'lucide-react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { TableRowSkeleton } from '../components/ui/Skeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {
  subscribeEmployees,
  inviteEmployee,
  removeEmployee,
} from '../services/employeeService';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ASSIGNABLE_EMPLOYEE_ROLES, ROLE_LABEL } from '../permissions/roles';
import { PERMS } from '../permissions/permissions';
import { friendlyDate } from '../utils/format';

export default function Employees() {
  const { shopId, can, plan } = useTenant();
  const { user } = useAuth();
  const toast = useToast();

  const canManage = can(PERMS.EMPLOYEE_MANAGE);
  const canView = can(PERMS.EMPLOYEE_VIEW);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ mobile: '', name: '', role: ASSIGNABLE_EMPLOYEE_ROLES[2] });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => {
    if (!shopId || !canView) return;
    const u = subscribeEmployees(shopId, (e) => {
      setEmployees(e);
      setLoading(false);
    });
    return () => u && u();
  }, [shopId, canView]);

  if (!canView) {
    return (
      <EmptyState
        icon={<Lock className="w-10 h-10" />}
        title="Permission required"
        description="Only the shop owner / manager can view employees."
      />
    );
  }

  const max = plan?.limits?.maxEmployees ?? 1;
  const atLimit = max !== -1 && employees.length >= max;

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(draft.mobile)) {
      toast.error('Mobile must be 10 digits');
      return;
    }
    if (atLimit) {
      toast.error(`Plan allows ${max} employees max — upgrade to add more.`);
      return;
    }
    setSubmitting(true);
    try {
      await inviteEmployee(shopId, draft, user?.uid);
      toast.success(`${draft.name || draft.mobile} invited as ${ROLE_LABEL[draft.role]}`);
      setOpen(false);
      setDraft({ mobile: '', name: '', role: ASSIGNABLE_EMPLOYEE_ROLES[2] });
    } catch (err) {
      toast.error(err.message || 'Invite failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!confirmDel) return;
    try {
      await removeEmployee(shopId, confirmDel.mobile, user?.uid);
      toast.success('Employee removed');
      setConfirmDel(null);
    } catch (err) {
      toast.error(err.message || 'Remove failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold">Employees</h2>
          <p className="text-sm text-slate-500">
            Cashiers and managers who can sign in for this shop.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={atLimit ? 'danger' : 'info'}>
            {employees.length} / {max === -1 ? '∞' : max} employees
          </Badge>
          {canManage && (
            <Button
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => setOpen(true)}
              disabled={atLimit}
            >
              Invite Employee
            </Button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Mobile</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Invited</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<UserPlus className="w-10 h-10" />}
                      title="No employees yet"
                      description={
                        canManage
                          ? 'Invite cashiers and managers to log in via mobile OTP.'
                          : 'No staff have been invited yet.'
                      }
                      action={
                        canManage && (
                          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)}>
                            Invite first employee
                          </Button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                employees.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 font-medium">{e.name || '—'}</td>
                    <td className="px-4 py-3">{e.mobile}</td>
                    <td className="px-4 py-3">
                      <Badge tone="brand">{ROLE_LABEL[e.role] || e.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={e.status === 'active' ? 'success' : 'info'}>
                        {e.status || 'invited'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{friendlyDate(e.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {canManage && (
                        <button
                          onClick={() => setConfirmDel(e)}
                          className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Invite Employee" size="sm">
        <form onSubmit={handleInvite} className="space-y-3">
          <Input
            label="Mobile (10 digits)"
            value={draft.mobile}
            onChange={(e) =>
              setDraft({ ...draft, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })
            }
            inputMode="numeric"
            required
          />
          <Input
            label="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Select
            label="Role"
            value={draft.role}
            onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            options={ASSIGNABLE_EMPLOYEE_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          />
          <p className="text-xs text-slate-500">
            They sign in at the same site URL via <strong>Mobile OTP</strong> with this number.
            On their first login they&apos;ll be automatically bound to this shop with the
            chosen role — no extra setup needed on their side.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleRemove}
        title="Remove employee?"
        message={`Remove ${confirmDel?.name || confirmDel?.mobile}? They will lose access on next login.`}
        confirmText="Remove"
        destructive
      />
    </div>
  );
}
