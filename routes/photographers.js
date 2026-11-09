const express = require('express');
const db = require('../db');
const { validatePhotographer, parseId } = require('../validation');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const photographers = await db.all('SELECT * FROM photographers ORDER BY id');
    res.status(200).json(photographers);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id must be a positive whole number' });
    const photographer = await db.get('SELECT * FROM photographers WHERE id = ?', [id]);
    if (!photographer) return res.status(404).json({ error: `Photographer ${id} not found` });
    res.status(200).json(photographer);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/rentals', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id must be a positive whole number' });
    const photographer = await db.get('SELECT id FROM photographers WHERE id = ?', [id]);
    if (!photographer) return res.status(404).json({ error: `Photographer ${id} not found` });
    const rentals = await db.all(
      `SELECT r.id, r.camera_id, c.name AS camera_name, r.rented_at, r.returned_at
       FROM rentals r JOIN cameras c ON c.id = r.camera_id
       WHERE r.photographer_id = ? ORDER BY r.id`,
      [id]
    );
    res.status(200).json(rentals);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const problem = validatePhotographer(req.body);
    if (problem) return res.status(400).json({ error: problem });
    const email = req.body.email ? req.body.email.trim() : null;
    const result = await db.run('INSERT INTO photographers (name, email) VALUES (?, ?)', [
      req.body.name.trim(),
      email
    ]);
    const photographer = await db.get('SELECT * FROM photographers WHERE id = ?', [result.lastID]);
    res.status(201).json(photographer);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id must be a positive whole number' });
    const problem = validatePhotographer(req.body);
    if (problem) return res.status(400).json({ error: problem });
    const email = req.body.email ? req.body.email.trim() : null;
    const result = await db.run('UPDATE photographers SET name = ?, email = ? WHERE id = ?', [
      req.body.name.trim(),
      email,
      id
    ]);
    if (result.changes === 0) return res.status(404).json({ error: `Photographer ${id} not found` });
    const photographer = await db.get('SELECT * FROM photographers WHERE id = ?', [id]);
    res.status(200).json(photographer);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id must be a positive whole number' });
    const result = await db.run('DELETE FROM photographers WHERE id = ?', [id]);
    if (result.changes === 0) return res.status(404).json({ error: `Photographer ${id} not found` });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Photographer has rentals and cannot be deleted' });
    }
    next(err);
  }
});

module.exports = router;
