@echo off
setlocal
cd /d "%~dp0"
if not exist "backend\.env" (
  echo Missing backend\.env. Copy backend\.env.example to backend\.env and edit it first.
  pause
  exit /b 1
)
if not exist "frontend\.env" (
  echo Missing frontend\.env. Copy frontend\.env.example to frontend\.env and edit it first.
  pause
  exit /b 1
)
start "VNHotel API" cmd /k "cd /d ""%~dp0backend"" && npm run dev"
start "VNHotel Web" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"
echo VNHotel API: http://localhost:5000/api/health
echo VNHotel Web: http://localhost:5173
echo Make sure MySQL is running and the database has been initialized.
