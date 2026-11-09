const express = require('express');
const db = require('../db');
const { validateRental, parseId } = require('../validation');

const router = express.Router();

const MAX_ACTIVE_RENTALS = 3;

router.get('/', async (req, res, next) => {
  try {
    let where = '';
    if (req.query.status === 'active') where = 'WHERE returned_at IS NULL';
    else if (req.query.status === 'returned') where = 'WHERE returned_at IS NOT NULL';
    else if (req.query.status !== undefined) {
      return res.status(400).json({ error: 'status must be active or returned' });
    }
    const rentals = await db.all(`SELECT * FROM rentals ${where} ORDER BY id`);
    res.status(200).json(rentals);
  } catch (err) {
    next(err);
  }
});

router.get('/details', async (req, res, next) => {
  try {
    const rentals = await db.all(
      `SELECT r.id,
              r.photographer_id,
              p.name AS photographer_name,
              r.camera_id,
              c.name AS camera_name,
              r.rented_at,
              r.returned_at
       FROM rentals r
       JOIN photographers p ON p.id = r.photographer_id
       JOIN cameras c ON c.id = r.camera_id
       ORDER BY r.id`
    );
    res.status(200).json(rentals);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id must be a positive whole number' });
    const rental = await db.get('SELECT * FROM rentals WHERE id = ?', [id]);
    if (!rental) return res.status(404).json({ error: `Rental ${id} not found` });
    res.status(200).json(rental);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const problem = validateRental(req.body);
    if (problem) return res.status(400).json({ error: problem });
    const { photographer_id, camera_id } = req.body;

    const photographer = await db.get('SELECT id FROM photographers WHERE id = ?', [photographer_id]);
    if (!photographer) {
      return res.status(404).json({ error: `Photographer ${photographer_id} not found` });
    }
    const camera = await db.get('SELECT id FROM cameras WHERE id = ?', [camera_id]);
    if (!camera) return res.status(404).json({ error: `Camera ${camera_id} not found` });

    const result = await db.run(
      `INSERT INTO rentals (photographer_id, camera_id)
       SELECT ?, ?
       WHERE (SELECT COUNT(*) FROM rentals
              WHERE photographer_id = ? AND returned_at IS NULL) < ?`,
      [photographer_id, camera_id, photographer_id, MAX_ACTIVE_RENTALS]
    );
    if (result.changes === 0) {
      return res.status(409).json({ error: `Limit of ${MAX_ACTIVE_RENTALS} reached` });
    }
    const rental = await db.get('SELECT * FROM rentals WHERE id = ?', [result.lastID]);
    res.status(201).json(rental);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/return', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'id must be a positive whole number' });
    const result = await db.run(
      "UPDATE rentals SET returned_at = datetime('now') WHERE id = ? AND returned_at IS NULL",
      [id]
    );
    if (result.changes === 0) {
      const existing = await db.get('SELECT id FROM rentals WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ error: `Rental ${id} not found` });
      return res.status(409).json({ error: 'Already returned' });
    }
    const rental = await db.get('SELECT * FROM rentals WHERE id = ?', [id]);
    res.status(200).json(rental);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
