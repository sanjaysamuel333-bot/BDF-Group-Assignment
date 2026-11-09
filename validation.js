const MAX_LENGTH = 100;

function textProblem(field, value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return `${field} is required and must be non-empty text`;
  }
  if (value.trim().length > MAX_LENGTH) {
    return `${field} must be at most ${MAX_LENGTH} characters`;
  }
  return null;
}

function validateCamera(body) {
  const data = body || {};
  const problems = [textProblem('name', data.name), textProblem('kind', data.kind)].filter(Boolean);
  return problems.length ? problems.join('; ') : null;
}

function validatePhotographer(body) {
  const data = body || {};
  const problems = [textProblem('name', data.name)];
  if (data.email !== undefined && data.email !== null) {
    if (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      problems.push('email must be a valid email address');
    }
  }
  const found = problems.filter(Boolean);
  return found.length ? found.join('; ') : null;
}

function validateRental(body) {
  const data = body || {};
  const problems = [];
  for (const field of ['photographer_id', 'camera_id']) {
    if (!Number.isInteger(data[field]) || data[field] < 1) {
      problems.push(`${field} is required and must be a positive whole number`);
    }
  }
  return problems.length ? problems.join('; ') : null;
}

function parseId(value) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id >= 1 ? id : null;
}

module.exports = { validateCamera, validatePhotographer, validateRental, parseId };
