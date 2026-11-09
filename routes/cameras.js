const express = require('express');
const db = require('../db');
const { validateCamera, parseId } = require('../validation');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];
    if (req.query.kind !== undefined) {
      conditions.push('kind = ? COLLATE NOCASE');
      params.push(String(req.query.kind).trim());
    }
    if (req.query.name !== undefined) {
      conditions.push('name LIKE ?');
      params.push(`%${String(req.query.name).trim()}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const cameras = await db.all(`SELECT * FROM cameras ${where} ORDER BY id`, params);
    res.status(200).json(cameras);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id must be a positive whole number' });
    const camera = await db.get('SELECT * FROM cameras WHERE id = ?', [id]);
    if (!camera) return res.status(404).json({ error: `Camera ${id} not found` });
    res.status(200).json(camera);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const problem = validateCamera(req.body);
    if (problem) return res.status(400).json({ error: problem });
    const name = req.body.name.trim();
    const kind = req.body.kind.trim();
    const result = await db.run('INSERT INTO cameras (name, kind) VALUES (?, ?)', [name, kind]);
    const camera = await db.get('SELECT * FROM cameras WHERE id = ?', [result.lastID]);
    res.status(201).json(camera);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id must be a positive whole number' });
    const problem = validateCamera(req.body);
    if (problem) return res.status(400).json({ error: problem });
    const result = await db.run('UPDATE cameras SET name = ?, kind = ? WHERE id = ?', [
      req.body.name.trim(),
      req.body.kind.trim(),
      id
    ]);
    if (result.changes === 0) return res.status(404).json({ error: `Camera ${id} not found` });
    const camera = await db.get('SELECT * FROM cameras WHERE id = ?', [id]);
    res.status(200).json(camera);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id must be a positive whole number' });
    const result = await db.run('DELETE FROM cameras WHERE id = ?', [id]);
    if (result.changes === 0) return res.status(404).json({ error: `Camera ${id} not found` });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Camera has rentals and cannot be deleted' });
    }
    next(err);
  }
});

module.exports = router;
