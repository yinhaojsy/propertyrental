import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ListingType, AreaUnit, BedOption, BathOption, SearchSortOption } from '@property-rental/shared';

export interface SearchState {
  city: 'all' | 'islamabad' | 'rawalpindi';
  sectorIds: number[];
  listingType: ListingType;
  propertySubtype: string;
  areaMin: number | null;
  areaMax: number | null;
  areaUnit: AreaUnit;
  beds: BedOption;
  baths: BathOption;
  priceMin: number | null;
  priceMax: number | null;
  isPenthouse: boolean;
  sort: SearchSortOption;
}

const initialState: SearchState = {
  city: 'all',
  sectorIds: [],
  listingType: 'residential',
  propertySubtype: 'house',
  areaMin: null,
  areaMax: null,
  areaUnit: 'sqft',
  beds: 'all',
  baths: 'all',
  priceMin: null,
  priceMax: null,
  isPenthouse: false,
  sort: 'popular',
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setSearchField<K extends keyof SearchState>(
      state: SearchState,
      action: PayloadAction<{ key: K; value: SearchState[K] }>,
    ) {
      state[action.payload.key] = action.payload.value;
    },
    setSearchState(_state, action: PayloadAction<Partial<SearchState>>) {
      return { ...initialState, ...action.payload };
    },
    resetSearch() {
      return initialState;
    },
    setCity(state, action: PayloadAction<SearchState['city']>) {
      state.city = action.payload;
      state.sectorIds = [];
    },
  },
});

export const { setSearchField, setSearchState, resetSearch, setCity } = searchSlice.actions;
export default searchSlice.reducer;

export function searchStateToQuery(state: SearchState): URLSearchParams {
  const params = new URLSearchParams();
  params.set('city', state.city);
  if (state.sectorIds.length) params.set('sectorIds', state.sectorIds.join(','));
  params.set('listingType', state.listingType);
  params.set('propertySubtype', state.propertySubtype);
  if (state.areaMin != null) params.set('areaMin', String(state.areaMin));
  if (state.areaMax != null) params.set('areaMax', String(state.areaMax));
  params.set('areaUnit', state.areaUnit);
  params.set('beds', state.beds);
  params.set('baths', state.baths);
  if (state.priceMin != null) params.set('priceMin', String(state.priceMin));
  if (state.priceMax != null) params.set('priceMax', String(state.priceMax));
  if (state.isPenthouse) params.set('isPenthouse', 'true');
  params.set('sort', state.sort);
  return params;
}

export function queryToSearchState(params: URLSearchParams): Partial<SearchState> {
  const sectorIdsRaw = params.get('sectorIds');
  return {
    city: (params.get('city') as SearchState['city']) || 'all',
    sectorIds: sectorIdsRaw ? sectorIdsRaw.split(',').map(Number).filter(Boolean) : [],
    listingType: (params.get('listingType') as ListingType) || 'residential',
    propertySubtype: params.get('propertySubtype') || 'house',
    areaMin: params.get('areaMin') ? Number(params.get('areaMin')) : null,
    areaMax: params.get('areaMax') ? Number(params.get('areaMax')) : null,
    areaUnit: (params.get('areaUnit') as AreaUnit) || 'sqft',
    beds: (params.get('beds') as BedOption) || 'all',
    baths: (params.get('baths') as BathOption) || 'all',
    priceMin: params.get('priceMin') ? Number(params.get('priceMin')) : null,
    priceMax: params.get('priceMax') ? Number(params.get('priceMax')) : null,
    isPenthouse: params.get('isPenthouse') === 'true',
    sort: (params.get('sort') as SearchSortOption) || 'popular',
  };
}
