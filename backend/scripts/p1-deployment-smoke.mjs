/** Non-mutating API connectivity checks; safe to run after production deploy. */
const base=process.env.P1_SMOKE_API_URL?.replace(/\/$/,'');
if(!base || !/^https?:\/\//.test(base)) throw new Error('Specify P1_SMOKE_API_URL, e.g. https://your-store.example/api/v1');
for(const endpoint of ['/health','/categories','/products?limit=1']) {
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try {
    const response=await fetch(base+endpoint,{signal:controller.signal,cache:'no-store'});
    if(!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
    const json=await response.json();if(!json || typeof json!=='object') throw new Error(`${endpoint}: invalid JSON`);
    console.log(`OK ${endpoint}: ${response.status}`);
  } finally {clearTimeout(timer);}
}

const site=process.env.P1_SMOKE_SITE_URL?.replace(/\/$/,'');
if(site) {
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try {
    const response=await fetch(site,{signal:controller.signal,redirect:'follow'});
    if(!response.ok)throw new Error(`SSR frontend: HTTP ${response.status}`);
    const html=await response.text();if(!html.includes('<html'))throw new Error('SSR frontend HTML was not returned');
    console.log(`OK website SSR ${site}: ${response.status}`);
  } finally {clearTimeout(timer);}
}
