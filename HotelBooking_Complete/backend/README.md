# VNHotel REST API

Node.js 20+ / Express / MySQL 8. The API is the active backend used by the React application.

```bash
cp .env.example .env
# Fill in DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET
npm install
npm run seed:admin
npm run dev
```

Health check: `GET http://localhost:5000/api/health`.

See the root `README.md` for database setup, OAuth providers, SMTP verification, payment gateways, callback URLs, and production requirements.
