import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { SearchListingsInput } from '@property-rental/shared';
import { getCsrfToken, initCsrf, setCsrfToken } from '../lib/api';
import { clearSession, resetSessionNotice, type AuthPortal } from './authSlice';

const baseUrl = import.meta.env.VITE_API_URL ?? '';

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include',
  prepareHeaders: async (headers, { type }) => {
    if (type === 'mutation') {
      let token = getCsrfToken();
      if (!token) {
        await initCsrf();
        token = getCsrfToken();
      }
      if (token) headers.set('X-CSRF-Token', token);
    }
    return headers;
  },
});

function requestPath(args: string | FetchArgs): string {
  return typeof args === 'string' ? args : args.url;
}

function authPortalForPath(path: string): AuthPortal {
  if (path.includes('/api/admin/')) return 'staff';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/staff')) {
    return 'staff';
  }
  return 'public';
}

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const path = requestPath(args);

  if (
    result.error?.status === 401 &&
    !path.includes('/auth/refresh') &&
    !path.includes('/auth/login') &&
    !path.includes('/auth/logout')
  ) {
    const refreshResult = await rawBaseQuery(
      { url: '/api/auth/refresh', method: 'POST' },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      const data = refreshResult.data as { csrfToken: string };
      setCsrfToken(data.csrfToken);
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(clearSession({ portal: authPortalForPath(path) }));
      api.dispatch(api.util.upsertQueryData('getMe', undefined, {}));
    }
  }

  return result;
};

export interface ListingCard {
  id: number;
  slug: string;
  city: { id: number; slug: string; nameEn: string; nameZh: string };
  sector: { id: number; slug: string; nameEn: string; nameZh: string | null };
  listingType: string;
  propertySubtype: string;
  rentAmount: number;
  currency: string;
  areaValue: number | null;
  areaUnit: string | null;
  beds: number | null;
  isStudio: boolean;
  baths: number | null;
  isPenthouse: boolean;
  titleEn: string;
  titleZh: string | null;
  coverPhotoUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  descriptionEn?: string | null;
  descriptionZh?: string | null;
  photos?: Array<{
    id: number;
    url: string | null;
    originalUrl: string | null;
    floor: string | null;
    roomType: string | null;
    roomLabel: string | null;
    roomLabelZh?: string | null;
    sortOrder: number;
    isCover: boolean;
  }>;
}

export interface Sector {
  id: number;
  cityId: number;
  slug: string;
  nameEn: string;
  nameZh: string | null;
  isActive?: boolean;
}

export interface City {
  id: number;
  slug: string;
  nameEn: string;
  nameZh: string;
  isActive?: boolean;
}

export interface PropertyType {
  id: number;
  slug: string;
  nameEn: string;
  nameZh: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface PropertySubtype {
  id: number;
  propertyTypeId: number;
  slug: string;
  nameEn: string;
  nameZh: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface PhotoFloor {
  id: number;
  slug: string;
  nameEn: string;
  nameZh: string;
  isActive: boolean;
  sortOrder: number;
}

export interface PhotoRoomType {
  id: number;
  slug: string;
  nameEn: string;
  nameZh: string;
  labelEn: string;
  labelZh: string;
  autoNumber: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface PhotoFloorRoomType {
  floorId: number;
  roomTypeId: number;
}

export interface PhotoConfig {
  floors: PhotoFloor[];
  roomTypes: PhotoRoomType[];
  floorRoomTypes: PhotoFloorRoomType[];
}

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  roles?: string[];
  permissions?: string[];
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Listings', 'Listing', 'Offers', 'Users', 'AdminListings', 'Cities', 'Sectors', 'PropertyTypes', 'PhotoConfig', 'Me'],
  endpoints: (builder) => ({
    getCsrf: builder.query<{ csrfToken: string }, void>({
      query: () => '/api/auth/csrf',
    }),
    getMe: builder.query<{ user?: User }, void>({
      async queryFn(_arg, _api, _extraOptions, fetchWithBQ) {
        const result = await fetchWithBQ('/api/auth/me');
        if (result.error) {
          const status = result.error.status;
          if (status === 401 || status === 403) {
            return { data: {} };
          }
          return { error: result.error };
        }
        return { data: result.data as { user: User } };
      },
      providesTags: (result) => (result?.user ? ['Me'] : []),
    }),
    login: builder.mutation<{ user: User; csrfToken: string }, { email: string; password: string }>({
      query: (body) => ({ url: '/api/auth/login', method: 'POST', body }),
      invalidatesTags: ['Me', 'Offers'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        setCsrfToken(data.csrfToken);
        dispatch(api.util.upsertQueryData('getMe', undefined, { user: data.user }));
      },
    }),
    register: builder.mutation<
      { user: User; csrfToken: string },
      { email: string; password: string; name: string; phone?: string }
    >({
      query: (body) => ({ url: '/api/auth/register', method: 'POST', body }),
      invalidatesTags: ['Me', 'Offers'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        setCsrfToken(data.csrfToken);
        dispatch(api.util.upsertQueryData('getMe', undefined, { user: data.user }));
      },
    }),
    logout: builder.mutation<{ ok: boolean }, void>({
      query: () => ({ url: '/api/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(api.util.upsertQueryData('getMe', undefined, {}));
          dispatch(api.util.upsertQueryData('getMyOffers', undefined, []));
          dispatch(resetSessionNotice());
        }
      },
    }),
    getCities: builder.query<City[], void>({
      query: () => '/api/locations/cities',
    }),
    getSectors: builder.query<Sector[], string>({
      query: (city) => `/api/locations/sectors?city=${city}`,
    }),
    getPropertyTypes: builder.query<
      { types: PropertyType[]; subtypes: PropertySubtype[] },
      void
    >({
      query: () => '/api/locations/property-types',
    }),
    getPhotoConfig: builder.query<PhotoConfig, void>({
      query: () => '/api/locations/photo-config',
    }),
    searchListings: builder.query<
      { data: ListingCard[]; pagination: { page: number; limit: number; total: number; totalPages: number } },
      Partial<SearchListingsInput>
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v == null) return;
          if (Array.isArray(v) && v.length === 0) return;
          if (Array.isArray(v)) searchParams.set(k, v.join(','));
          else searchParams.set(k, String(v));
        });
        return `/api/listings/search?${searchParams.toString()}`;
      },
      providesTags: ['Listings'],
    }),
    getListing: builder.query<ListingCard, string>({
      query: (slugOrId) => `/api/listings/${slugOrId}`,
      providesTags: (_r, _e, id) => [{ type: 'Listing', id }],
    }),
    createOffer: builder.mutation<
      unknown,
      { listingId: number; name: string; phone: string; email: string; offeredRent?: number; message?: string }
    >({
      query: (body) => ({ url: '/api/offers', method: 'POST', body }),
    }),
    getMyOffers: builder.query<unknown[], void>({
      query: () => '/api/offers/my',
      providesTags: ['Offers'],
    }),
    getAdminDashboard: builder.query<unknown, void>({
      query: () => '/api/admin/dashboard',
    }),
    getAdminListings: builder.query<unknown[], void>({
      query: () => '/api/admin/listings',
      providesTags: ['AdminListings'],
    }),
    getAdminListing: builder.query<unknown, number>({
      query: (id) => `/api/admin/listings/${id}`,
    }),
    createListing: builder.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: '/api/admin/listings', method: 'POST', body }),
      invalidatesTags: ['AdminListings'],
    }),
    createDraftListing: builder.mutation<{ id: number }, Record<string, unknown>>({
      query: (body) => ({ url: '/api/admin/listings/draft', method: 'POST', body }),
      invalidatesTags: ['AdminListings'],
    }),
    updateListing: builder.mutation<unknown, { id: number; data: Record<string, unknown> }>({
      query: ({ id, data }) => ({ url: `/api/admin/listings/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['AdminListings', 'Listings'],
    }),
    updateListingStatus: builder.mutation<unknown, { id: number; status: string }>({
      query: ({ id, status }) => ({
        url: `/api/admin/listings/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['AdminListings', 'Listings'],
    }),
    presignPhoto: builder.mutation<
      { uploadUrl: string; storageKey: string },
      { listingId: number; filename: string; contentType: string }
    >({
      query: ({ listingId, filename, contentType }) => ({
        url: `/api/admin/listings/${listingId}/photos/presign`,
        method: 'POST',
        body: { filename, contentType },
      }),
    }),
    confirmPhoto: builder.mutation<
      unknown,
      { listingId: number; data: Record<string, unknown> }
    >({
      query: ({ listingId, data }) => ({
        url: `/api/admin/listings/${listingId}/photos/confirm`,
        method: 'POST',
        body: data,
      }),
    }),
    reorderPhotos: builder.mutation<
      unknown,
      { listingId: number; photos: Array<{ id: number; sortOrder: number; isCover?: boolean }> }
    >({
      query: ({ listingId, photos }) => ({
        url: `/api/admin/listings/${listingId}/photos/reorder`,
        method: 'PATCH',
        body: { photos },
      }),
    }),
    deleteListingPhoto: builder.mutation<
      { ok: boolean; derived?: { beds: number; baths: number } },
      { listingId: number; photoId: number }
    >({
      query: ({ listingId, photoId }) => ({
        url: `/api/admin/listings/${listingId}/photos/${photoId}`,
        method: 'DELETE',
      }),
    }),
    deleteAllListingPhotos: builder.mutation<
      { ok: boolean; derived?: { beds: number; baths: number } },
      number
    >({
      query: (listingId) => ({
        url: `/api/admin/listings/${listingId}/photos`,
        method: 'DELETE',
      }),
    }),
    getAdminOffers: builder.query<unknown[], number | void>({
      query: (listingId) =>
        listingId
          ? `/api/admin/offers?listingId=${listingId}`
          : '/api/admin/offers',
    }),
    createRentalRecord: builder.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: '/api/admin/rental-records', method: 'POST', body }),
      invalidatesTags: ['AdminListings'],
    }),
    getAdminUsers: builder.query<
      Array<{ id: number; name: string; email: string; roles: string[] }>,
      void
    >({
      query: () => '/api/admin/users',
    }),
    getAdminClients: builder.query<
      Array<{
        id: number;
        name: string;
        email: string;
        phone: string | null;
        isActive: boolean;
        createdAt: string;
      }>,
      void
    >({
      query: () => '/api/admin/clients',
    }),
    createUser: builder.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: '/api/admin/users', method: 'POST', body }),
    }),
    getRoles: builder.query<unknown[], void>({
      query: () => '/api/admin/roles',
    }),
    getAdminCities: builder.query<City[], void>({
      query: () => '/api/admin/cities',
      providesTags: ['Cities'],
    }),
    createCity: builder.mutation<City, Record<string, unknown>>({
      query: (body) => ({ url: '/api/admin/cities', method: 'POST', body }),
      invalidatesTags: ['Cities'],
    }),
    updateCity: builder.mutation<City, { id: number; data: Record<string, unknown> }>({
      query: ({ id, data }) => ({ url: `/api/admin/cities/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['Cities'],
    }),
    deleteCity: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({ url: `/api/admin/cities/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Cities', 'Sectors'],
    }),
    getAdminSectors: builder.query<Sector[], number | void>({
      query: (cityId) =>
        cityId ? `/api/admin/sectors?cityId=${cityId}` : '/api/admin/sectors',
      providesTags: ['Sectors'],
    }),
    createSector: builder.mutation<Sector, Record<string, unknown>>({
      query: (body) => ({ url: '/api/admin/sectors', method: 'POST', body }),
      invalidatesTags: ['Sectors'],
    }),
    updateSector: builder.mutation<Sector, { id: number; data: Record<string, unknown> }>({
      query: ({ id, data }) => ({ url: `/api/admin/sectors/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['Sectors'],
    }),
    deleteSector: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({ url: `/api/admin/sectors/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Sectors'],
    }),
    getAdminPropertyTypes: builder.query<
      { types: PropertyType[]; subtypes: PropertySubtype[] },
      void
    >({
      query: () => '/api/admin/property-types',
      providesTags: ['PropertyTypes'],
    }),
    createPropertyType: builder.mutation<PropertyType, Record<string, unknown>>({
      query: (body) => ({ url: '/api/admin/property-types', method: 'POST', body }),
      invalidatesTags: ['PropertyTypes'],
    }),
    updatePropertyType: builder.mutation<
      PropertyType,
      { id: number; data: Record<string, unknown> }
    >({
      query: ({ id, data }) => ({
        url: `/api/admin/property-types/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['PropertyTypes'],
    }),
    deletePropertyType: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({ url: `/api/admin/property-types/${id}`, method: 'DELETE' }),
      invalidatesTags: ['PropertyTypes'],
    }),
    createPropertySubtype: builder.mutation<PropertySubtype, Record<string, unknown>>({
      query: (body) => ({ url: '/api/admin/property-subtypes', method: 'POST', body }),
      invalidatesTags: ['PropertyTypes'],
    }),
    updatePropertySubtype: builder.mutation<
      PropertySubtype,
      { id: number; data: Record<string, unknown> }
    >({
      query: ({ id, data }) => ({
        url: `/api/admin/property-subtypes/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['PropertyTypes'],
    }),
    deletePropertySubtype: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({ url: `/api/admin/property-subtypes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['PropertyTypes'],
    }),
    getAdminPhotoConfig: builder.query<PhotoConfig, void>({
      query: () => '/api/admin/photo-config',
      providesTags: ['PhotoConfig'],
    }),
    createPhotoFloor: builder.mutation<PhotoFloor, Record<string, unknown>>({
      query: (body) => ({ url: '/api/admin/photo-floors', method: 'POST', body }),
      invalidatesTags: ['PhotoConfig'],
    }),
    updatePhotoFloor: builder.mutation<PhotoFloor, { id: number; data: Record<string, unknown> }>({
      query: ({ id, data }) => ({ url: `/api/admin/photo-floors/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['PhotoConfig'],
    }),
    deletePhotoFloor: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({ url: `/api/admin/photo-floors/${id}`, method: 'DELETE' }),
      invalidatesTags: ['PhotoConfig'],
    }),
    createPhotoRoomType: builder.mutation<PhotoRoomType, Record<string, unknown>>({
      query: (body) => ({ url: '/api/admin/photo-room-types', method: 'POST', body }),
      invalidatesTags: ['PhotoConfig'],
    }),
    updatePhotoRoomType: builder.mutation<
      PhotoRoomType,
      { id: number; data: Record<string, unknown> }
    >({
      query: ({ id, data }) => ({
        url: `/api/admin/photo-room-types/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['PhotoConfig'],
    }),
    deletePhotoRoomType: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({ url: `/api/admin/photo-room-types/${id}`, method: 'DELETE' }),
      invalidatesTags: ['PhotoConfig'],
    }),
    setPhotoFloorRoomTypes: builder.mutation<
      { floorRoomTypes: PhotoFloorRoomType[] },
      { floorId: number; roomTypeIds: number[] }
    >({
      query: ({ floorId, roomTypeIds }) => ({
        url: `/api/admin/photo-floors/${floorId}/room-types`,
        method: 'PUT',
        body: { roomTypeIds },
      }),
      invalidatesTags: ['PhotoConfig'],
    }),
  }),
});

export const {
  useGetCsrfQuery,
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetCitiesQuery,
  useGetSectorsQuery,
  useSearchListingsQuery,
  useGetListingQuery,
  useCreateOfferMutation,
  useGetMyOffersQuery,
  useGetAdminDashboardQuery,
  useGetAdminListingsQuery,
  useGetAdminListingQuery,
  useCreateListingMutation,
  useCreateDraftListingMutation,
  useUpdateListingMutation,
  useUpdateListingStatusMutation,
  usePresignPhotoMutation,
  useConfirmPhotoMutation,
  useReorderPhotosMutation,
  useDeleteListingPhotoMutation,
  useDeleteAllListingPhotosMutation,
  useGetAdminOffersQuery,
  useCreateRentalRecordMutation,
  useGetAdminUsersQuery,
  useGetAdminClientsQuery,
  useCreateUserMutation,
  useGetRolesQuery,
  useGetPropertyTypesQuery,
  useGetAdminCitiesQuery,
  useCreateCityMutation,
  useUpdateCityMutation,
  useDeleteCityMutation,
  useGetAdminSectorsQuery,
  useCreateSectorMutation,
  useUpdateSectorMutation,
  useDeleteSectorMutation,
  useGetAdminPropertyTypesQuery,
  useCreatePropertyTypeMutation,
  useUpdatePropertyTypeMutation,
  useDeletePropertyTypeMutation,
  useCreatePropertySubtypeMutation,
  useUpdatePropertySubtypeMutation,
  useDeletePropertySubtypeMutation,
  useGetPhotoConfigQuery,
  useGetAdminPhotoConfigQuery,
  useCreatePhotoFloorMutation,
  useUpdatePhotoFloorMutation,
  useDeletePhotoFloorMutation,
  useCreatePhotoRoomTypeMutation,
  useUpdatePhotoRoomTypeMutation,
  useDeletePhotoRoomTypeMutation,
  useSetPhotoFloorRoomTypesMutation,
} = api;
