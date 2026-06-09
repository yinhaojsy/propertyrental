import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  formatPermissionLabel,
  type Permission,
} from '@property-rental/shared';
import {
  useGetRolesQuery,
  useUpdateRolePermissionsMutation,
  useGetMeQuery,
} from '../../store/api';
import { userHasPermission } from '../../lib/permissions';

interface AdminRole {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
}

export function AdminRolesPage() {
  const { t } = useTranslation();
  const { data: meData } = useGetMeQuery();
  const { data: roles, isLoading } = useGetRolesQuery();
  const [updateRolePermissions] = useUpdateRolePermissionsMutation();
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<Permission[]>([]);
  const [saving, setSaving] = useState(false);

  const canEdit = userHasPermission(meData?.user?.permissions, 'roles:write');

  const groupedPermissions = useMemo(() => {
    const assigned = new Set(Object.values(PERMISSION_GROUPS).flat());
    const other = PERMISSIONS.filter((p) => !assigned.has(p));
    return { ...PERMISSION_GROUPS, other };
  }, []);

  const startEdit = (role: AdminRole) => {
    setEditingRoleId(role.id);
    setDraftPermissions(
      role.permissions.filter((p): p is Permission => PERMISSIONS.includes(p as Permission)),
    );
  };

  const togglePermission = (permission: Permission) => {
    setDraftPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    );
  };

  const saveRole = async () => {
    if (editingRoleId == null) return;
    setSaving(true);
    try {
      await updateRolePermissions({
        id: editingRoleId,
        permissions: draftPermissions,
      }).unwrap();
      setEditingRoleId(null);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p>{t('common.loading')}</p>;

  const roleList = (roles ?? []) as AdminRole[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('admin.rolesNav')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('admin.rolesHelp')}</p>
      </div>

      <div className="space-y-4">
        {roleList.map((role) => {
          const isEditing = editingRoleId === role.id;
          const isSuperAdmin = role.name === 'super_admin';

          return (
            <div key={role.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold capitalize">{role.name.replace(/_/g, ' ')}</h2>
                  {role.description && (
                    <p className="mt-0.5 text-sm text-gray-500">{role.description}</p>
                  )}
                </div>
                {canEdit && !isSuperAdmin && !isEditing && (
                  <button
                    type="button"
                    onClick={() => startEdit(role)}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    {t('admin.editPermissions')}
                  </button>
                )}
                {isEditing && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingRoleId(null)}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      {t('admin.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveRole()}
                      disabled={saving}
                      className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      {saving ? t('common.loading') : t('admin.save')}
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {Object.entries(groupedPermissions).map(([group, perms]) => (
                    <div key={group}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {group}
                      </h3>
                      <div className="space-y-1">
                        {perms.map((permission) => (
                          <label
                            key={permission}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={draftPermissions.includes(permission)}
                              onChange={() => togglePermission(permission)}
                            />
                            {formatPermissionLabel(permission)}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {role.permissions.length === 0 ? (
                    <span className="text-sm text-gray-400">{t('admin.noPermissions')}</span>
                  ) : (
                    role.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
                      >
                        {permission}
                      </span>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
