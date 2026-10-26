// Run with Node 22.13+ (uses its built-in TypeScript transform).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { webcrypto } = require('node:crypto');
const path = require('node:path');

const root = path.join(__dirname, '..');
function backend() {
  const state = { project: { title: 'Example', kind: 'client', modules_rev: 4, modules: [] }, notices: [], locked: false };
  const sql = async (parts, ...values) => {
    const query = parts.join('?');
    if (query.includes('from storage.objects')) {
      assert.equal(state.locked, false, 'storage lookup must not acquire another pool connection while holding the project lock');
      return [{ size: 10 }];
    }
    if (query.includes('select title, kind, modules')) return [structuredClone(state.project)];
    if (query.includes('set modules =')) {
      state.project.modules = structuredClone(values[0]);
      state.project.modules_rev++;
      return [];
    }
    if (query.includes('insert into portfolio.portal_notices')) { state.notices.push(values); return [{ id: 'notice' }]; }
    if (query.includes('insert into portfolio.portal_events')) return [];
    throw new Error('Unexpected test query: ' + query);
  };
  sql.begin = async fn => { state.locked = true; try { return await fn(sql); } finally { state.locked = false; } };
  sql.json = x => x;
  const source = fs.readFileSync(path.join(root, 'backend/portfolio-portal.ts'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/const sql = postgres\([\s\S]*?\nconst REVIEW_BUSINESS_DAYS/, 'const REVIEW_BUSINESS_DAYS');
  const context = vm.createContext({ sql, crypto: webcrypto, console, Deno: { env: { get: () => '' }, serve: () => {} }, fetch: () => { throw Error('No network in regression tests'); }, TextEncoder, URL });
  vm.runInContext(stripTypeScriptTypes(source, { mode: 'transform' }) + '\nthis.api={handle,normalizeModules,clientModules,announceModules,rowOf,resetChangedApprovals};', context);
  return { state, ...context.api };
}
const client = { id: 'client', role: 'client', project_ids: ['example'], label: 'Client' };
const action = (op, extra = {}) => ({ op, project_id: 'example', module_id: 'screen01', rev: 4, ...extra });

test('stale client cannot approve a newer proof, estimate, signature or gallery', async () => {
  for (const [op, type] of [['proof_approve', 'proof'], ['estimate_authorize', 'estimate'], ['sign_item', 'sign'], ['gallery_send', 'gallery']]) {
    const b = backend();
    b.state.project.modules = [{ id: 'screen01', type, version: 'v2', items: [{ id: 'line0001', t: 'Latest', price: 20000, pick: true }], picks: ['line0001'] }];
    await assert.rejects(b.handle(client, action(op, { rev: 3, item_id: 'line0001', name: 'Test Client' })), e => e.status === 409);
    assert.equal(b.state.project.modules_rev, 4);
    assert.equal(b.state.notices.length, 0);
  }
});

test('a current proof approval persists once and notifies the owner', async () => {
  const b = backend();
  b.state.project.modules = [{ id: 'screen01', type: 'proof', title: 'Preview', version: 'v2' }];
  await b.handle(client, action('proof_approve'));
  assert.equal(b.state.project.modules[0].approved_version, 'v2');
  assert.equal(b.state.project.modules_rev, 5);
  assert.equal(b.state.notices.length, 1);
  await assert.rejects(b.handle(client, action('proof_approve')), e => e.status === 409);
});

test('project access, hidden screens and missing revisions refuse client writes', async () => {
  const b = backend();
  b.state.project.modules = [{ id: 'screen01', type: 'proof', hidden: true, version: 'v1' }];
  await assert.rejects(b.handle({ ...client, project_ids: [] }, action('proof_approve')), e => e.status === 403);
  await assert.rejects(b.handle(client, action('proof_approve')), e => e.status === 404);
  await assert.rejects(b.handle(client, action('proof_approve', { rev: undefined })), e => e.status === 409);
  assert.equal(b.state.project.modules_rev, 4);
  assert.equal(b.state.notices.length, 0);
});

test('gallery rejects invented and hidden picture ids without writing', async () => {
  const b = backend();
  b.state.project.modules = [{ id: 'screen01', type: 'gallery', items: [{ id: 'picture1' }, { id: 'picture2', hidden: true }], picks: [], limit: 2 }];
  for (const key of ['invented', 'picture2', '0']) {
    await assert.rejects(b.handle(client, action('gallery_pick', { key, on: true })), e => e.status === 404);
    assert.equal(b.state.project.modules_rev, 4);
  }
  await b.handle(client, action('gallery_pick', { key: 'picture1', on: true }));
  assert.deepEqual(Array.from(b.state.project.modules[0].picks), ['picture1']);
});

test('gallery placeholder range is bounded, and send drops picks hidden by owner', async () => {
  const b = backend();
  b.state.project.modules = [{ id: 'screen01', type: 'gallery', show: 3, picks: [], limit: 2 }];
  await assert.rejects(b.handle(client, action('gallery_pick', { key: '3', on: true })), e => e.status === 404);
  await b.handle(client, action('gallery_pick', { key: '2', on: true }));
  b.state.project.modules[0].items = [{ id: 'picture1' }, { id: 'picture2', hidden: true }];
  b.state.project.modules[0].picks = ['picture1', 'picture2', 'invented'];
  await b.handle(client, action('gallery_send', { rev: 5 }));
  assert.deepEqual(Array.from(b.state.project.modules[0].picks), ['picture1']);
  assert.equal(b.state.notices.length, 1);
});

test('a gallery limit lowered by the owner also applies when sending existing picks', async () => {
  const b = backend();
  b.state.project.modules = [{ id: 'screen01', type: 'gallery', items: [{ id: 'picture1' }, { id: 'picture2' }], picks: ['picture1', 'picture2'], limit: 1 }];
  await assert.rejects(b.handle(client, action('gallery_send')), e => e.status === 409);
  assert.equal(b.state.project.modules_rev, 4);
  assert.equal(b.state.notices.length, 0);
});

test('client view strips private data and hidden gallery choices without creating placeholder tiles', () => {
  const b = backend();
  const safe = b.clientModules([{ id: 'screen01', type: 'gallery', _private: 'secret', items: [{ id: 'picture1', hidden: true }], picks: ['picture1'] },
    { id: 'screen02', type: 'docs', items: [{ id: 'line0001', file: { path: 'private/path', name: 'file.txt', size: 3 } }] }]);
  assert.equal(safe[0].show, 0);
  assert.equal(safe[0].picks.length, 0);
  assert.equal(safe[0].items.length, 0);
  assert.equal(JSON.stringify(safe).includes('secret'), false);
  assert.equal(JSON.stringify(safe).includes('private/path'), false);
});

test('normalization rejects ambiguous duplicate screen and line ids', () => {
  const b = backend();
  assert.throws(() => b.normalizeModules([{ id: 'screen01', type: 'docs' }, { id: 'screen01', type: 'docs' }]), e => e.status === 400);
  assert.throws(() => b.normalizeModules([{ id: 'screen01', type: 'docs', items: [{ id: 'line0001' }, { id: 'line0001' }] }]), e => e.status === 400);
});

test('reopened requests, signatures, proof, gallery and changed prices announce once', async () => {
  const b = backend();
  const before = [
    { id: 'docs0001', type: 'docs', items: [{ id: 'line0001', t: 'Footage', state: 'accepted' }] },
    { id: 'sign0001', type: 'sign', items: [{ id: 'line0002', t: 'Agreement', signed: true }] },
    { id: 'proof001', type: 'proof', version: 'v1', approved: true },
    { id: 'gallery1', type: 'gallery', sent: true },
    { id: 'estimate', type: 'estimate', items: [{ id: 'line0003', t: 'Work', price: 10000 }] }
  ];
  const after = structuredClone(before);
  after[0].items[0].state = 'needed'; after[1].items[0].signed = false;
  after[2].approved = false; after[3].sent = false; after[4].items[0].price = 20000;
  await b.announceModules('example', before, after);
  assert.equal(b.state.notices.length, 4);
  b.state.notices.length = 0;
  await b.announceModules('example', after, structuredClone(after));
  assert.equal(b.state.notices.length, 0);
});

test('hidden doc file stays available to the owner only', () => {
  const b = backend();
  const m = { items: [{ id: 'line0001', hidden: true, file: { path: 'private/path' } }] };
  assert.throws(() => b.rowOf(m, { item_id: 'line0001' }), e => e.status === 404);
  assert.equal(b.rowOf(m, { item_id: 'line0001' }, 'items', true).file.path, 'private/path');
});

test('upload metadata is checked before taking the transaction connection', async () => {
  const b = backend();
  b.state.project.modules = [{ id: 'screen01', type: 'docs', items: [{ id: 'line0001', t: 'Source file', state: 'needed' }] }];
  await b.handle(client, action('doc_received', { item_id: 'line0001', path: 'example/screen01/line0001/test.txt', name: 'test.txt' }));
  assert.equal(b.state.project.modules[0].items[0].file.size, 10);
  assert.equal(b.state.notices.length, 1);
});

test('two screens of the same type route an action to the clicked screen and revision', () => {
  const source = fs.readFileSync(path.join(root, 'portal/modules.js'), 'utf8');
  const context = vm.createContext({ confirm: () => true, CSS: { escape: x => x } });
  vm.runInContext(source + '\nthis.modules=PORTAL_MODULES;', context);
  const mods = [{ id: 'proof001', type: 'proof', title: 'First', version: 'v1' }, { id: 'proof002', type: 'proof', title: 'Second', version: 'v2' }];
  let listener, call;
  const app = { addEventListener: (kind, fn) => { if (kind === 'click') listener = fn; } };
  const section = { dataset: { module: 'proof002' } };
  const button = { dataset: { proof: 'approve' }, closest: sel => sel === 'button' ? button : section };
  context.modules.bind(app, () => mods, () => {}, () => {}, { projectId: () => 'example', revision: () => 7, act: (op, body) => { call = { op, body }; } });
  listener({ target: button });
  assert.equal(call.body.module_id, 'proof002');
  assert.equal(call.body.rev, 7);
  const html = context.modules.render(mods, { live: true });
  assert.ok(html.includes('id="mod-proof001"'));
  assert.ok(html.includes('id="mod-proof002"'));
  assert.deepEqual(Array.from(context.modules.derivedNeeds(mods), n => n.go), ['proof001', 'proof002']);
});

test('changing approved content reopens its approval while unrelated edits preserve it', () => {
  const b = backend();
  const before = [
    { id: 'estimate', type: 'estimate', authorized: true, authorized_total: 10000, items: [{ id: 'line0001', t: 'Work', price: 10000 }] },
    { id: 'proof001', type: 'proof', approved: true, approved_version: 'v1', version: 'v1', url: 'https://example.com/v1' },
    { id: 'sign0001', type: 'sign', items: [{ id: 'line0002', t: 'Agreement', url: 'https://example.com/old', signed: true, signed_name: 'Client' }] }
  ];
  const same = structuredClone(before); same[0].title = 'Retitled estimate';
  b.resetChangedApprovals(before, same);
  assert.equal(same[0].authorized, true);
  assert.equal(same[1].approved, true);
  assert.equal(same[2].items[0].signed, true);
  const after = structuredClone(before);
  after[0].items[0].price = 20000;
  after[1].url = 'https://example.com/v2';
  after[2].items[0].url = 'https://example.com/new';
  b.resetChangedApprovals(before, after);
  assert.equal(after[0].authorized, undefined);
  assert.equal(after[0].authorized_total, undefined);
  assert.equal(after[1].approved, undefined);
  assert.equal(after[2].items[0].signed, undefined);
});
