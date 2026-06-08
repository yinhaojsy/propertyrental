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

export function StaffRoutes() {
  return (
    <Routes>
      <Route element={<StaffPortalLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="listings" element={<AdminListingsPage />} />
        <Route path="listings/new" element={<AdminListingEditPage />} />
        <Route path="listings/:id/edit" element={<AdminListingEditPage />} />
        <Route path="offers" element={<AdminOffersPage />} />
        <Route path="clients" element={<AdminClientsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="locations" element={<AdminLocationsPage />} />
        <Route path="property-types" element={<AdminPropertyTypesPage />} />
        <Route path="photo-config" element={<AdminPhotoConfigPage />} />
        <Route path="badges" element={<AdminBadgesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>
    </Routes>
  );
}

export function AdminRedirect() {
  return <Navigate to="/staff" replace />;
}
