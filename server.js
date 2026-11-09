const express = require('express');
const db = require('./db');
const camerasRouter = require('./routes/cameras');
const photographersRouter = require('./routes/photographers');
const rentalsRouter = require('./routes/rentals');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({
    name: 'LensLab Studio camera rental API',
    routes: ['/photographers', '/cameras', '/rentals', '/rentals/details']
  });
});

app.use('/photographers', photographersRouter);
app.use('/cameras', camerasRouter);
app.use('/rentals', rentalsRouter);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  db.ready.then(() => {
    app.listen(PORT, () => console.log(`LensLab Studio API running on http://localhost:${PORT}`));
  });
}

module.exports = app;
