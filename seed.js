const db = require('./db');

async function seed() {
  await db.ready;
  const existing = await db.get('SELECT COUNT(*) AS total FROM photographers');
  if (existing.total > 0) {
    console.log('Database already has data, seed skipped');
    return;
  }
  const photographers = [
    ['Asha', 'asha@example.com'],
    ['Ravi', 'ravi@example.com'],
    ['Meera', 'meera@example.com']
  ];
  const cameras = [
    ['Canon EOS R6', 'mirrorless'],
    ['Sony A7 III', 'mirrorless'],
    ['Nikon D850', 'dslr'],
    ['Canon EOS 90D', 'dslr'],
    ['Fujifilm X100V', 'compact']
  ];
  for (const [name, email] of photographers) {
    await db.run('INSERT INTO photographers (name, email) VALUES (?, ?)', [name, email]);
  }
  for (const [name, kind] of cameras) {
    await db.run('INSERT INTO cameras (name, kind) VALUES (?, ?)', [name, kind]);
  }
  console.log('Seeded 3 photographers and 5 cameras');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
