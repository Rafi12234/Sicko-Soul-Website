"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/apiClient";
import { getAdminAccessToken, getAdminStaff, listenForAdminSession, refreshAdminSession, signOutAdmin, setAdminSession } from "@/lib/adminSession";

type Staff = { id: string; fullName: string; email: string; role: string };
type SessionState = { staff: Staff | null; token: string; checking: boolean; recoveryError: string };
type Context = SessionState & {
  restore: () => Promise<void>;
  acceptLogin: (data: {token: string;staff: Staff}) => void;
  logout: () => Promise<void>;
};
const AdminContext = createContext<Context | null>(null);
export function useAdminSession(): Context {
  const value = useContext(AdminContext);
  if (!value) throw new Error("AdminSessionProvider is missing");
  return value;
}
export default function AdminSessionProvider({children}:{children: ReactNode}) {
  const [state, setState] = useState<SessionState>({ staff:null, token:"", checking:true, recoveryError:"" });
  const sync = useCallback(() => {
    setState(current=>({ ...current, staff:getAdminStaff(), token:getAdminAccessToken() }));
  }, []);
  const restore = useCallback(async () => {
    setState(current=>({...current,checking:true,recoveryError:""}));
    try {
      await refreshAdminSession();
      sync();
    } catch (error) {
      sync();
      if (!(error instanceof ApiError && (error.status===401 || error.status===403))) {
        setState(current=>({...current,recoveryError:"The authentication service is unavailable. Your session may still be valid; retry when connected."}));
      }
    } finally {
      setState(current=>({...current,checking:false}));
    }
  },[sync]);
  useEffect(() => {
    const unsubscribe = listenForAdminSession(sync);
    void restore();
    return unsubscribe;
  },[restore,sync]);
  const acceptLogin = useCallback((data:{token:string;staff:Staff}) => { setAdminSession(data); sync(); },[sync]);
  const logout = useCallback(async () => { await signOutAdmin(); sync(); },[sync]);
  const value = useMemo<Context>(()=>({...state,restore,acceptLogin,logout}),[state,restore,acceptLogin,logout]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
