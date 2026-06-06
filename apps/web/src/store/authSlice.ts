import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type AuthPortal = 'staff' | 'public';

interface AuthState {
  sessionExpired: boolean;
  expiredPortal: AuthPortal | null;
}

const initialState: AuthState = {
  sessionExpired: false,
  expiredPortal: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearSession(state, action: PayloadAction<{ portal: AuthPortal }>) {
      state.sessionExpired = true;
      state.expiredPortal = action.payload.portal;
    },
    resetSessionNotice(state) {
      state.sessionExpired = false;
      state.expiredPortal = null;
    },
  },
});

export const { clearSession, resetSessionNotice } = authSlice.actions;
export default authSlice.reducer;
