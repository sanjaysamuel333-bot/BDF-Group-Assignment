process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert');
const app = require('../server');
const db = require('../db');

let server;
let base;

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

test.before(async () => {
  await db.ready;
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
});

test.after(() => {
  server.close();
});

test('cameras CRUD, validation and search', async () => {
  const created = await call('POST', '/cameras', { name: 'Canon R6', kind: 'mirrorless' });
  assert.strictEqual(created.status, 201);
  const id = created.body.id;

  await call('POST', '/cameras', { name: 'Nikon D850', kind: 'dslr' });

  assert.strictEqual((await call('GET', '/cameras')).status, 200);
  assert.strictEqual((await call('GET', `/cameras/${id}`)).status, 200);
  assert.strictEqual((await call('GET', '/cameras/9999')).status, 404);
  assert.strictEqual((await call('GET', '/cameras/abc')).status, 400);

  const search = await call('GET', '/cameras?kind=MIRRORLESS');
  assert.strictEqual(search.status, 200);
  assert.strictEqual(search.body.length, 1);
  assert.strictEqual(search.body[0].name, 'Canon R6');

  const badAdd = await call('POST', '/cameras', { name: '  ', kind: 5 });
  assert.strictEqual(badAdd.status, 400);
  assert.match(badAdd.body.error, /name/);
  assert.match(badAdd.body.error, /kind/);

  const badUpdate = await call('PUT', `/cameras/${id}`, { name: 'Only name' });
  assert.strictEqual(badUpdate.status, 400);

  const updated = await call('PUT', `/cameras/${id}`, { name: 'Canon R6 II', kind: 'mirrorless' });
  assert.strictEqual(updated.status, 200);
  assert.strictEqual(updated.body.name, 'Canon R6 II');
  assert.strictEqual((await call('PUT', '/cameras/9999', { name: 'x', kind: 'y' })).status, 404);

  const temp = await call('POST', '/cameras', { name: 'Temp', kind: 'film' });
  assert.strictEqual((await call('DELETE', `/cameras/${temp.body.id}`)).status, 204);
  assert.strictEqual((await call('DELETE', `/cameras/${temp.body.id}`)).status, 404);
});

test('twist: three active rentals at a time', async () => {
  const asha = (await call('POST', '/photographers', { name: 'Asha' })).body;
  const ids = [];
  for (let i = 1; i <= 4; i++) {
    ids.push((await call('POST', '/cameras', { name: `Cam ${i}`, kind: 'dslr' })).body.id);
  }

  const rentals = [];
  for (let i = 0; i < 3; i++) {
    const r = await call('POST', '/rentals', { photographer_id: asha.id, camera_id: ids[i] });
    assert.strictEqual(r.status, 201);
    rentals.push(r.body);
  }

  const fourth = await call('POST', '/rentals', { photographer_id: asha.id, camera_id: ids[3] });
  assert.strictEqual(fourth.status, 409);
  assert.strictEqual(fourth.body.error, 'Limit of 3 reached');

  const returned = await call('POST', `/rentals/${rentals[0].id}/return`);
  assert.strictEqual(returned.status, 200);
  assert.ok(returned.body.returned_at);

  const again = await call('POST', `/rentals/${rentals[0].id}/return`);
  assert.strictEqual(again.status, 409);
  assert.strictEqual(again.body.error, 'Already returned');

  const fresh = await call('POST', '/rentals', { photographer_id: asha.id, camera_id: ids[3] });
  assert.strictEqual(fresh.status, 201);

  const other = (await call('POST', '/photographers', { name: 'Ravi' })).body;
  const unaffected = await call('POST', '/rentals', { photographer_id: other.id, camera_id: ids[0] });
  assert.strictEqual(unaffected.status, 201);
});

test('concurrent requests cannot exceed the limit', async () => {
  const p = (await call('POST', '/photographers', { name: 'Meera' })).body;
  const c = (await call('POST', '/cameras', { name: 'Race cam', kind: 'compact' })).body;
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      call('POST', '/rentals', { photographer_id: p.id, camera_id: c.id })
    )
  );
  assert.strictEqual(results.filter((r) => r.status === 201).length, 3);
  assert.strictEqual(results.filter((r) => r.status === 409).length, 5);
});

test('rental validation, missing rows and join endpoint', async () => {
  assert.strictEqual((await call('POST', '/rentals', {})).status, 400);
  assert.strictEqual((await call('POST', '/rentals', { photographer_id: 9999, camera_id: 1 })).status, 404);
  assert.strictEqual((await call('POST', '/rentals/9999/return')).status, 404);

  const details = await call('GET', '/rentals/details');
  assert.strictEqual(details.status, 200);
  assert.ok(details.body.length > 0);
  assert.ok(details.body[0].photographer_name);
  assert.ok(details.body[0].camera_name);

  const active = await call('GET', '/rentals?status=active');
  assert.strictEqual(active.status, 200);
  assert.ok(active.body.every((r) => r.returned_at === null));
  assert.strictEqual((await call('GET', '/rentals?status=bogus')).status, 400);
});

test('camera with rentals cannot be deleted', async () => {
  const rentals = (await call('GET', '/rentals')).body;
  const del = await call('DELETE', `/cameras/${rentals[0].camera_id}`);
  assert.strictEqual(del.status, 409);
});
