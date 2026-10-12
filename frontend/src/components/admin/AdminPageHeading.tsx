export default function AdminPageHeading({eyebrow,title,description}:{eyebrow:string;title:string;description?:string}){
  return <div className="mb-7 min-w-0 border-b border-white/10 pb-6"><p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-red-500">{eyebrow}</p><h1 className="mt-2 break-words font-display text-4xl leading-none sm:text-5xl">{title}</h1>{description&&<p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">{description}</p>}</div>;
}
