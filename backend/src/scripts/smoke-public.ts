const base = (process.env.SMOKE_API_BASE_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");

const checks = [
  ["health", "/health"],
  ["categories", "/categories"],
  ["products", "/products?limit=2"],
  ["collections", "/collections"],
] as const;

let failed = false;
for (const [name, path] of checks) {
  try {
    const response = await fetch(`${base}${path}`);
    const text = await response.text();
    if (!response.ok) {
      failed = true;
      console.error(`[FAIL] ${name} HTTP ${response.status}: ${text.slice(0, 500)}`);
    } else {
      console.log(`[OK] ${name} HTTP ${response.status}`);
    }
  } catch (error) {
    failed = true;
    console.error(`[FAIL] ${name}:`, error instanceof Error ? error.message : error);
  }
}

if (failed) process.exitCode = 1;
