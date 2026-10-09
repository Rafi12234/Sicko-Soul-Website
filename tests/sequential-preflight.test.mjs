import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const script = readFileSync(fileURLToPath(new URL('../deploy/cpanel/deploy-cpanel.sh', import.meta.url)), 'utf8');

test('candidate backend terminates before candidate frontend starts', () => {
  const backendReady = script.indexOf('\nwait_backend\n');
  const backendStop = script.indexOf('kill "$BACK_PID" 2>/dev/null || true', backendReady);
  const backendWait = script.indexOf('wait "$BACK_PID" 2>/dev/null || true', backendStop);
  const frontendStart = script.indexOf('node "$FRONT_RELEASE/server.js" > "$FRONT_RELEASE/deploy-smoke.log"', backendWait);
  assert.ok(backendReady >= 0, 'backend health check must complete');
  assert.ok(backendStop > backendReady, 'backend candidate should be stopped after readiness');
  assert.ok(backendWait > backendStop, 'backend candidate should be reaped');
  assert.ok(frontendStart > backendWait, 'frontend must only start after backend stops');
});

test('candidate checks run before the activation switch', () => {
  const backendReady = script.indexOf('\nwait_backend\n');
  const frontendReady = script.indexOf('\nwait_frontend\n');
  const activate = script.indexOf('\nstatus activating\n');
  assert.ok(backendReady >= 0 && frontendReady > backendReady);
  assert.ok(activate > frontendReady, 'activation must follow both preflight checks');
});
