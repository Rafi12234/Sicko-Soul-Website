"use client";
export default function AdminError({reset}:{error:Error & {digest?:string}; reset:()=>void}) {
  return <div role="alert" className="mx-auto my-10 max-w-lg border border-red-800 bg-[#131316] p-6 text-white"><p className="text-xs uppercase tracking-wider text-red-400">Admin workspace</p><h2 className="mt-3 font-display text-3xl">PAGE UNAVAILABLE</h2><p className="mt-3 text-sm leading-6 text-white/60">This management page could not load. No update has been confirmed. Verify the backend connection before retrying.</p><button type="button" onClick={reset} className="mt-5 border border-white/30 px-4 py-3 text-xs uppercase tracking-wider hover:border-red-600">Try again</button></div>;
}
