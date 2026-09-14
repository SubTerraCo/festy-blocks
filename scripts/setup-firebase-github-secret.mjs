/**
 * Creates a GCP service account for GitHub Actions deploy and uploads
 * FIREBASE_SERVICE_ACCOUNT to GitHub (matches .github/workflows/deploy.yml).
 *
 * Run from festival-scheduler/ after `firebase login`:
 *   node scripts/setup-firebase-github-secret.mjs
 */
import { createRequire } from 'node:module';
import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { getGlobalDefaultAccount } = require('firebase-tools/lib/auth');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { createServiceAccount, createServiceAccountKey } = require('firebase-tools/lib/gcp/iam');
const { addServiceAccountToRoles, firebaseRoles } = require('firebase-tools/lib/gcp/resourceManager');

const PROJECT_ID = 'festy-blocks';
const REPO = 'SubTerraCo/festy-blocks';
const SECRET_NAME = 'FIREBASE_SERVICE_ACCOUNT';

const repoId = execSync(`gh api repos/${REPO} --jq .id`, { encoding: 'utf8' }).trim();
const accountId = `github-action-${repoId}`;

console.log(`Project: ${PROJECT_ID}`);
console.log(`Repo: ${REPO} (id ${repoId})`);
console.log(`Service account id: ${accountId}`);

const account = getGlobalDefaultAccount();
if (!account?.user || !account?.tokens) {
  throw new Error('Not logged in. Run: .\\node_modules\\.bin\\firebase.cmd login');
}
await requireAuth({ project: PROJECT_ID, projectId: PROJECT_ID, ...account });

try {
  await createServiceAccount(
    PROJECT_ID,
    accountId,
    `Firebase Hosting deploy for ${REPO}`,
    `GitHub Actions (${REPO})`
  );
  console.log('Created service account.');
} catch (e) {
  if (!String(e.message || e).includes('409')) throw e;
  console.log('Service account already exists — reusing.');
}

const roles = [
  firebaseRoles.authAdmin,
  firebaseRoles.serviceUsageConsumer,
  firebaseRoles.apiKeysViewer,
  firebaseRoles.hostingAdmin,
  firebaseRoles.runViewer,
  firebaseRoles.functionsDeveloper,
];
await addServiceAccountToRoles(PROJECT_ID, accountId, roles);
console.log('Granted hosting deploy roles.');

const key = await createServiceAccountKey(PROJECT_ID, accountId);
const json = Buffer.from(key.privateKeyData, 'base64').toString('utf8');

const tmp = join(tmpdir(), `firebase-sa-${Date.now()}.json`);
writeFileSync(tmp, json, 'utf8');
try {
  const result = spawnSync(
    'gh',
    ['secret', 'set', SECRET_NAME, '--repo', REPO],
    { input: json, stdio: ['pipe', 'inherit', 'inherit'] }
  );
  if (result.status !== 0) throw new Error('gh secret set failed');
  console.log(`Uploaded GitHub secret: ${SECRET_NAME}`);
} finally {
  unlinkSync(tmp);
}

console.log('Done. Re-run the deploy workflow on GitHub Actions.');
