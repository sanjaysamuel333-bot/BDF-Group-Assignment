# LensLab Studio - Camera Rental API

Group assignment CSE-FSD-2B-G05 (Backend Development Fundamentals, Modules 1 to 3).

LensLab Studio lends cameras by phone call and has had two photographers turn up for the same camera. This API replaces the phone calls with a proper record of photographers, cameras and rentals.

Built with Node.js, Express and SQLite (`sqlite3`).

## Twist: Three at a time

A photographer can hold at most 3 active rentals (rentals that have no return date). The 4th attempt is refused with `409` and the message `Limit of 3 reached`. Returning a rental frees a place.

| Test | Request | Result |
| --- | --- | --- |
| 1 | Create 3 rentals for Asha | `201`, `201`, `201` |
| 2 | Create a 4th rental for Asha | `409` `{"error":"Limit of 3 reached"}` |
| 3 | Return one, then create a new one | `200`, then `201` |

The limit is enforced inside a single SQL statement (`INSERT ... SELECT ... WHERE active count < 3`), so two requests arriving at the same moment cannot both slip past the limit.

Returning a rental twice gives `409` `{"error":"Already returned"}`.

## How to run

You need Node.js 18 or newer.

```powershell
git clone <repo-link>
cd lenslab-studio
npm install
npm run seed
npm start
```

The server runs on `http://localhost:3000` (set the `PORT` environment variable to change it). The SQLite file is created automatically at `data/lenslab.db`. `npm run seed` adds 3 photographers and 5 cameras and is safe to skip. To start from a clean database, stop the server and delete the `data` folder.

Run the automated tests with `npm test`.

## Database

Three related tables:

- `photographers` (id, name, email)
- `cameras` (id, name, kind)
- `rentals` (id, photographer_id, camera_id, rented_at, returned_at)

`rentals.photographer_id` and `rentals.camera_id` are foreign keys. A rental is active while `returned_at` is `NULL`.

## Endpoints

### Cameras (name and kind)

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| GET | `/cameras` | 200 | |
| GET | `/cameras?kind=dslr` | 200 (search by kind, ignores capital letters) | |
| GET | `/cameras?name=canon` | 200 (search by part of the name) | |
| GET | `/cameras/:id` | 200 | 400 bad id, 404 not found |
| POST | `/cameras` | 201 | 400 validation |
| PUT | `/cameras/:id` | 200 | 400 validation or bad id, 404 not found |
| DELETE | `/cameras/:id` | 204 | 400 bad id, 404 not found, 409 camera has rentals |

Body for POST and PUT: `{ "name": "Canon EOS R6", "kind": "mirrorless" }`

### Rentals

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| POST | `/rentals` | 201 | 400 validation, 404 photographer or camera not found, 409 `Limit of 3 reached` |
| POST | `/rentals/:id/return` | 200 | 400 bad id, 404 not found, 409 `Already returned` |
| GET | `/rentals` | 200 (`?status=active` or `?status=returned`) | 400 bad status |
| GET | `/rentals/:id` | 200 | 400 bad id, 404 not found |
| GET | `/rentals/details` | 200 (join endpoint) | |

Body for POST `/rentals`: `{ "photographer_id": 1, "camera_id": 2 }`

Join endpoint `GET /rentals/details` returns each rental with `photographer_name` and `camera_name`:

```json
{
  "id": 1,
  "photographer_id": 1,
  "photographer_name": "Asha",
  "camera_id": 2,
  "camera_name": "Sony A7 III",
  "rented_at": "2026-11-10 09:30:00",
  "returned_at": null
}
```

### Photographers

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| GET | `/photographers` | 200 | |
| GET | `/photographers/:id` | 200 | 400, 404 |
| GET | `/photographers/:id/rentals` | 200 | 400, 404 |
| POST | `/photographers` | 201 | 400 validation |
| PUT | `/photographers/:id` | 200 | 400, 404 |
| DELETE | `/photographers/:id` | 204 | 400, 404, 409 photographer has rentals |

Body for POST and PUT: `{ "name": "Asha", "email": "asha@example.com" }` (email is optional).

## Validation

Every error is returned as JSON in the form `{ "error": "message" }`.

- Camera `name` and `kind` are required, must be text, cannot be blank and can be at most 100 characters. Both fields are checked on add and on update, and every problem is listed in the message, for example `name is required and must be non-empty text; kind is required and must be non-empty text`.
- Photographer `name` is required; `email`, if given, must look like an email address.
- Rental `photographer_id` and `camera_id` must be positive whole numbers.
- A URL id that is not a positive whole number returns `400`.
- A request body that is not valid JSON returns `400`.

## Postman

Import `postman/LensLab-Studio.postman_collection.json`. The collection variable `baseUrl` is `http://localhost:3000`. Start the server, then run the collection with the Collection Runner. It creates its own data, so it can be run again and again, and it contains 35 requests with 45 test assertions covering CRUD, validation, search, the join endpoint and the three twist tests.

## Project structure

```
server.js            Express app and route mounting
db.js                SQLite connection and table creation
validation.js        Input checks
seed.js              Optional sample data
routes/cameras.js
routes/photographers.js
routes/rentals.js
tests/api.test.js    Automated tests (npm test)
postman/             Postman collection
```

## Team

| Part | Responsibility | Member |
| --- | --- | --- |
| 1 | Server and routes | |
| 2 | Database | |
| 3 | REST endpoints | |
| 4 | Validation and search | |
| 5 | Twist rule | |
| 6 | Postman and README | |
