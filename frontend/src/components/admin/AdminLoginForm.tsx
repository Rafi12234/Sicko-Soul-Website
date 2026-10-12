"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, type DataEnvelope } from "@/lib/apiClient";
import { safeAdminNext, getAdminHome,canAccessSection } from "@/lib/adminNavigation";
import { useAdminSession } from "@/components/admin/AdminSessionProvider";
import { adminButton } from "@/components/admin/AdminShell";

type Staff = {id:string;fullName:string;email:string;role:string};
export default function AdminLoginForm() {
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [loading,setLoading]=useState(false);
  const {staff,acceptLogin} = useAdminSession();const router=useRouter();const params=useSearchParams();
  const requested=safeAdminNext(params.get("next"));
  useEffect(()=>{if(staff)router.replace(requested && canAccessSection(staff.role,requested)?requested:getAdminHome(staff.role))},[staff,requested,router]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setError("");setLoading(true);
    try{const result=await apiRequest<DataEnvelope<{token:string;staff:Staff}>>("/admin/auth/login",{method:"POST",cache:"no-store",credentials:"include",body:JSON.stringify({email,password})});setPassword("");acceptLogin(result.data);router.replace(requested && canAccessSection(result.data.staff.role,requested)?requested:getAdminHome(result.data.staff.role));}
    catch(err){setError(err instanceof Error?err.message:"Could not sign in. Please retry.")}
    finally{setLoading(false)}
  }
  return <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-8 px-5 py-12 sm:px-8"><div><p className="text-xs font-bold uppercase tracking-[0.3em] text-red-500">Authorized personnel only</p><h1 className="mt-3 font-display text-5xl sm:text-6xl">CONTROL ROOM</h1><p className="mt-3 text-sm text-white/60">Sign in using your staff credentials.</p></div><form onSubmit={submit} className="space-y-5 border border-white/15 bg-[#141416] p-5 sm:p-8"><label className="block text-xs uppercase tracking-wider text-white/70">Email<input autoComplete="username" required type="email" maxLength={255} value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 block min-h-12 w-full border border-white/20 bg-[#0b0b0d] px-3 text-base text-white outline-none focus:border-red-500"/></label><label className="block text-xs uppercase tracking-wider text-white/70">Password<input autoComplete="current-password" required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 block min-h-12 w-full border border-white/20 bg-[#0b0b0d] px-3 text-base text-white outline-none focus:border-red-500"/></label>{error&&<p role="alert" className="border-l-2 border-red-500 pl-3 text-sm text-red-200">{error}</p>}<button disabled={loading} className={`${adminButton} w-full border-red-700 bg-red-950/20`}>{loading?"AUTHENTICATING…":"SIGN IN SECURELY"}</button></form><Link href="/" className="text-xs uppercase tracking-wider text-white/50 hover:text-white">← Back to storefront</Link></main>;
}
