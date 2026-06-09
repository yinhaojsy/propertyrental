import { Routes, Route, Navigate } from 'react-router-dom';
import { StaffPortalLayout } from '../../components/StaffPortalLayout';
import { AdminDashboard } from '../admin/AdminDashboard';
import { AdminListingsPage } from '../admin/AdminListingsPage';
import { AdminListingEditPage } from '../admin/AdminListingEditPage';
import { AdminOffersPage } from '../admin/AdminOffersPage';
import { AdminUsersPage } from '../admin/AdminUsersPage';
import { AdminClientsPage } from '../admin/AdminClientsPage';
import { AdminLocationsPage } from '../admin/AdminLocationsPage';
import { AdminPropertyTypesPage } from '../admin/AdminPropertyTypesPage';
import { AdminPhotoConfigPage } from '../admin/AdminPhotoConfigPage';
import { AdminBadgesPage } from '../admin/AdminBadgesPage';
import { AdminSettingsPage } from '../admin/AdminSettingsPage';
import { AdminRolesPage } from '../admin/AdminRolesPage';
import { PermissionGate } from '../../components/PermissionGate';

export function StaffRoutes() {
  return (
    <Routes>
      <Route element={<StaffPortalLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="listings" element={<AdminListingsPage />} />
        <Route path="listings/new" element={<AdminListingEditPage />} />
        <Route path="listings/:id/edit" element={<AdminListingEditPage />} />
        <Route
          path="offers"
          element={
            <PermissionGate permission="offers:read">
              <AdminOffersPage />
            </PermissionGate>
          }
        />
        <Route
          path="clients"
          element={
            <PermissionGate permission="clients:read">
              <AdminClientsPage />
            </PermissionGate>
          }
        />
        <Route
          path="users"
          element={
            <PermissionGate permission="users:read">
              <AdminUsersPage />
            </PermissionGate>
          }
        />
        <Route
          path="locations"
          element={
            <PermissionGate permission="locations:read">
              <AdminLocationsPage />
            </PermissionGate>
          }
        />
        <Route
          path="property-types"
          element={
            <PermissionGate permission="locations:read">
              <AdminPropertyTypesPage />
            </PermissionGate>
          }
        />
        <Route
          path="photo-config"
          element={
            <PermissionGate permission="photo-config:read">
              <AdminPhotoConfigPage />
            </PermissionGate>
          }
        />
        <Route
          path="badges"
          element={
            <PermissionGate permission="badges:read">
              <AdminBadgesPage />
            </PermissionGate>
          }
        />
        <Route
          path="settings"
          element={
            <PermissionGate permission="settings:read">
              <AdminSettingsPage />
            </PermissionGate>
          }
        />
        <Route
          path="roles"
          element={
            <PermissionGate permission="roles:read">
              <AdminRolesPage />
            </PermissionGate>
          }
        />
      </Route>
    </Routes>
  );
}

export function AdminRedirect() {
  return <Navigate to="/staff" replace />;
}
