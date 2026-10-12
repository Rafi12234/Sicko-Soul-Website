"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ADMIN_SECTIONS,canAccessSection } from "@/lib/adminNavigation";
import { useAdminSession } from "@/components/admin/AdminSessionProvider";

const groups = ["WORKSPACE","COMMERCE","PEOPLE","SYSTEM"] as const;
export const adminButton = "inline-flex min-h-11 items-center justify-center border border-white/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:border-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-50";

export default function AdminShell({ children }: {children: ReactNode}) {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const {staff, checking, recoveryError, restore, logout} = useAdminSession();
  const [open,setOpen] = useState(false);
  const [logoutError,setLogoutError] = useState("");
  const isLogin = pathname==="/admin/login";
  useEffect(()=>setOpen(false),[pathname]);
  useEffect(()=>{if (!checking && !recoveryError && !staff && !isLogin) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);},[checking,recoveryError,staff,isLogin,pathname,router]);
  useEffect(()=>{if(open){const onEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};window.addEventListener("keydown",onEscape);return()=>window.removeEventListener("keydown",onEscape)}},[open]);

  if (checking) return <main className="flex min-h-dvh items-center justify-center bg-[#0b0b0d] px-5 text-white" role="status"><span className="mr-3 h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent"/>RESTORING SECURE SESSION</main>;
  if (recoveryError && !staff) return <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-5 text-white"><h1 className="font-display text-4xl">CONNECTION INTERRUPTED</h1><p role="alert" className="text-white/70">{recoveryError}</p><button type="button" onClick={()=>void restore()} className={adminButton}>Retry secure connection</button></main>;
  if (isLogin) return <div className="min-h-dvh bg-[#0b0b0d] text-white">{children}</div>;
  if (!staff) return <div role="status" className="min-h-dvh bg-[#0b0b0d]" aria-label="Redirecting to staff login"/>;
  if (!canAccessSection(staff.role,pathname)) return <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-5 p-6 text-white"><p className="text-xs uppercase tracking-[0.25em] text-red-500">Restricted operation</p><h1 className="font-display text-5xl">ACCESS DENIED</h1><p className="text-white/70">Your staff role cannot access this admin page. The API independently enforces permissions.</p><Link href="/admin" className={adminButton}>Back to overview</Link></main>;

  const navigation = <nav className="space-y-5" aria-label="Admin navigation">{groups.map(group=>{
    const items=ADMIN_SECTIONS.filter(item=>item.group===group && canAccessSection(staff.role,item.href));
    if (!items.length) return null;
    return <div key={group}><h2 className="mb-2 px-3 text-[0.65rem] font-semibold tracking-[0.2em] text-white/40">{group}</h2><div className="space-y-1">{items.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)} aria-current={pathname===item.href?"page":undefined} className={`flex min-h-11 items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline focus-visible:outline-red-500 ${pathname===item.href?"border-red-600 bg-red-950/40 text-white":"border-transparent text-white/65 hover:bg-white/5 hover:text-white"}`}><span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center border border-white/10 bg-black/30 font-mono text-[0.66rem] text-red-300">{item.short}</span><span>{item.label}</span></Link>)}</div></div>})}<Link href="/" target="_blank" rel="noopener noreferrer" className="mt-4 block border-t border-white/10 px-3 pt-4 text-xs uppercase tracking-wider text-white/60 hover:text-white">↗ View storefront</Link></nav>;
  return <div className="min-h-dvh bg-[#0b0b0d] text-white">
    <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#0b0b0d]/95 px-4 backdrop-blur-sm lg:hidden">
      <Link href="/admin" className="font-display text-2xl tracking-tight">SICKO SOUL <span className="text-red-600">/</span> ADMIN</Link>
      <button type="button" className={adminButton} aria-expanded={open} aria-controls="admin-mobile-menu" onClick={()=>setOpen(v=>!v)}>{open?"Close":"Menu"}</button>
    </header>
    {open && <button type="button" aria-label="Close navigation" onClick={()=>setOpen(false)} className="fixed inset-0 z-40 bg-black/75 lg:hidden"/>}
    <aside id="admin-mobile-menu" className={`${open?"translate-x-0":"-translate-x-full"} fixed inset-y-0 left-0 z-50 w-[min(85vw,330px)] overflow-y-auto border-r border-white/10 bg-[#101013] px-4 py-5 transition-transform duration-200 lg:hidden`}><div className="mb-7 flex items-center justify-between"><span className="font-display text-2xl">CONTROL ROOM</span><button type="button" onClick={()=>setOpen(false)} className={adminButton}>Close</button></div>{navigation}</aside>
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden h-dvh overflow-y-auto border-r border-white/10 bg-[#101013] px-4 py-6 lg:sticky lg:top-0 lg:block"><div className="mb-8 px-3"><p className="text-[0.63rem] font-bold tracking-[0.3em] text-red-500">SICKO SOUL</p><h1 className="mt-2 font-display text-3xl">CONTROL ROOM</h1></div>{navigation}</aside>
      <div className="min-w-0"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6 xl:px-9"><div className="min-w-0"><p className="text-[0.65rem] uppercase tracking-[0.19em] text-red-500">Restricted operations</p><p className="mt-1 truncate text-sm text-white/70">{staff.fullName} <span className="text-white/35">/ {staff.role}</span></p></div><button type="button" onClick={()=>{setLogoutError("");void logout().then(()=>router.replace("/admin/login")).catch(()=>setLogoutError("Could not revoke your session. Please retry."))}} className={adminButton}>Sign out</button></header>
        {logoutError && <p role="alert" className="mx-4 mt-4 border-l-2 border-red-500 p-3 text-sm text-red-200">{logoutError}</p>}
        <main id="admin-content" className="mx-auto w-full max-w-[1500px] min-w-0 px-4 py-7 sm:px-6 xl:px-9 xl:py-10">{children}</main>
      </div>
    </div>
  </div>;
}
