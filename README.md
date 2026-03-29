# Studio Attendance System

Phase 1 includes JWT auth, QR validation, GPS checks, live photo capture, device binding, and MongoDB-backed attendance.

The QR behavior is now daily: one QR remains valid for all employees for the current day, and a new QR is generated on the next day.
Admins can also force-rotate the current day's QR from the dashboard if needed.
If an employee scans an old QR after rotation, the app now tells them to rescan the latest QR from the admin.
Employees who check in after 09:35 AM are marked late.

Phase 2 now adds:

- Office GPS settings managed from the admin dashboard
- Employee activate/deactivate controls
- Inline employee phone number editing
- Employee edit modal for name, password, phone number, avatar, documents, and face
- Filterable attendance logs
- CSV export for attendance reports
- Attendance charts and analytics on the admin dashboard
- Better loading states and clearer frontend errors

Phase 3 now adds:

- Face reference enrollment for employees
- Face verification during check-in
- Real-time live attendance feed for admins via Socket.IO
- Employee avatars and documents
- Admin employee profile tabs for overview, attendance, device, and alerts

If local MongoDB is not installed, the backend now falls back to an embedded MongoDB stored on disk in `backend/.mongo-data`, so your local data survives backend restarts.

## Folder Structure

```text
studio-attendance-phase1/
|-- backend/
|   |-- package.json
|   |-- .env.example
|   |-- server.js
|   |-- scripts/seedAdmin.js
|   `-- src/
|       |-- app.js
|       |-- config/db.js
|       |-- controllers/
|       |-- middleware/
|       |-- models/
|       |-- routes/
|       |-- services/
|       `-- utils/
`-- frontend/
    |-- package.json
    |-- .env.example
    |-- index.html
    |-- vite.config.js
    `-- src/
        |-- api/client.js
        |-- components/
        |-- context/AuthContext.jsx
        |-- hooks/useDeviceFingerprint.js
        `-- pages/
```

## Run

### Backend

```bash
cd backend
Copy-Item .env.example .env
npm install
npm run seed:admin
npm run dev
```

### Frontend

```bash
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Seeded admin credentials:

- `admin@studio.com`
- `Admin@123`

Notes:

- The backend auto-creates the default admin on startup if it does not exist.
- With the embedded Mongo fallback, keep using the same `backend/.mongo-data` folder for persistent local data.
- Face reference uploads and check-in photos accept PNG and JPEG data URLs.
- Employee contact fields now use `Phone number` labels across the UI.

## Deployment

This project is now set up to run as a single production app:

- Build the frontend into `frontend/dist`
- Start the backend in production mode
- Express will serve the built React app and the API from one server

### MongoDB Atlas

1. Create a cluster in [MongoDB Atlas](https://www.mongodb.com/atlas/database)
2. Create a database user with a username and password
3. Add your deploy platform IPs to Network Access
4. In Atlas, click `Connect` -> `Drivers`
5. Copy the connection string and replace:
   - `<username>`
   - `<password>`
   - database name with `studio-attendance`
6. Put the final value into `MONGODB_URI`

Example:

```bash
MONGODB_URI=mongodb+srv://db_user:db_password@cluster0.xxxxx.mongodb.net/studio-attendance?retryWrites=true&w=majority&appName=studio-attendance
```

### Production Build

```bash
docker build -t studio-attendance .
```

### Production Start

```bash
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e REQUIRE_HTTPS=false \
  -e JWT_SECRET=replace-me \
  -e MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/studio-attendance \
  studio-attendance
```

### Production Notes

- In production, the frontend is served by the backend from `frontend/dist`
- The frontend now defaults to `/api`, so no separate API URL is required when both are hosted together
- Socket.IO now defaults to the current site origin in production
- Set a strong `JWT_SECRET` before deployment
- Set `NODE_ENV=production` on the server
- Set a real hosted MongoDB URI in `MONGODB_URI`
- Set `REQUIRE_HTTPS=true` when your platform terminates SSL in front of the app
- Render can deploy directly from [render.yaml](C:\Users\singh\OneDrive\Desktop\New folder (2)\studio-attendance-phase1\render.yaml)
- Railway can deploy from the [Dockerfile](C:\Users\singh\OneDrive\Desktop\New folder (2)\studio-attendance-phase1\Dockerfile)
- A VPS can run the same Docker image behind Nginx, Caddy, or another reverse proxy

### Render Step By Step

1. Push this project to GitHub
2. In Render, create a new `Blueprint`
3. Point it to the repo that contains this project
4. Render will pick up [render.yaml](C:\Users\singh\OneDrive\Desktop\New folder (2)\studio-attendance-phase1\render.yaml)
5. Add these environment variables in Render:
   - `JWT_SECRET`
   - `MONGODB_URI`
   - `NODE_ENV=production`
   - `REQUIRE_HTTPS=true`
6. Deploy
7. Open the generated Render URL and log in

### Railway Step By Step

1. Push this project to GitHub
2. In Railway, create a new project from GitHub
3. Select this repo
4. Railway will use the [Dockerfile](C:\Users\singh\OneDrive\Desktop\New folder (2)\studio-attendance-phase1\Dockerfile)
5. Add these variables:
   - `JWT_SECRET`
   - `MONGODB_URI`
   - `NODE_ENV=production`
   - `REQUIRE_HTTPS=true`
6. Deploy
7. Attach a custom domain if needed

### VPS With HTTPS

You now have ready-made templates in the `deploy` folder:

- Production env template:
  [env.production.example](C:\Users\singh\OneDrive\Desktop\New folder (2)\studio-attendance-phase1\deploy\env.production.example)
- Caddy config:
  [Caddyfile](C:\Users\singh\OneDrive\Desktop\New folder (2)\studio-attendance-phase1\deploy\Caddyfile)
- Nginx config:
  [nginx.conf](C:\Users\singh\OneDrive\Desktop\New folder (2)\studio-attendance-phase1\deploy\nginx.conf)

#### VPS Docker Run

```bash
docker build -t studio-attendance .
docker run -d \
  --name studio-attendance \
  --restart unless-stopped \
  --env-file deploy/env.production.example \
  -p 5000:5000 \
  studio-attendance
```

#### Caddy

- Replace `your-domain.com` in [Caddyfile](C:\Users\singh\OneDrive\Desktop\New folder (2)\studio-attendance-phase1\deploy\Caddyfile)
- Point your domain to the VPS
- Start Caddy
- Caddy will handle HTTPS automatically

#### Nginx

- Replace `your-domain.com` in [nginx.conf](C:\Users\singh\OneDrive\Desktop\New folder (2)\studio-attendance-phase1\deploy\nginx.conf)
- Install certbot or use your existing TLS certificates
- Place the config in your Nginx sites configuration
- Reload Nginx
