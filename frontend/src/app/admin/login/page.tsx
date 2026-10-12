import {Suspense} from "react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
export default function LoginPage(){return <Suspense fallback={<div className="flex min-h-dvh items-center justify-center text-sm text-white/65">Loading secure login…</div>}><AdminLoginForm/></Suspense>}
