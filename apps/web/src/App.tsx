import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { PublicRequireAuth } from './components/PublicRequireAuth';
import { SearchPage } from './pages/SearchPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import {
  LoginPage,
  RegisterPage,
  AccountPage,
  MyOffersPage,
} from './pages/AuthPages';
import { StaffLoginPage } from './pages/staff/StaffLoginPage';
import { StaffRoutes, AdminRedirect } from './pages/staff/StaffRoutes';

export default function App() {
  return (
    <Routes>
      {/* Internal staff portal — separate from public site */}
      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route path="/staff/*" element={<StaffRoutes />} />
      <Route path="/admin/*" element={<AdminRedirect />} />

      {/* Public rental search site */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Navigate to="/search" replace />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/listings/:slug" element={<ListingDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/account"
          element={
            <PublicRequireAuth>
              <AccountPage />
            </PublicRequireAuth>
          }
        />
        <Route
          path="/my-offers"
          element={
            <PublicRequireAuth>
              <MyOffersPage />
            </PublicRequireAuth>
          }
        />
      </Route>
    </Routes>
  );
}
