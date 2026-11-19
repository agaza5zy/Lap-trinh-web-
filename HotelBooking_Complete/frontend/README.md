# VNHotel Frontend

React + Vite frontend. For local development, run the backend on port 5000 and then run `npm run dev`; Vite proxies `/api` to `http://localhost:5000`.

For Vercel, the root workspace build command writes the production frontend into the repository root `public/` directory. The root Express app serves the API and React Router fallback on the same domain. Set `VITE_API_URL=/api` and any `VITE_` OAuth values in Vercel before deployment.
