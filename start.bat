@echo off
echo Starting QC-Booklog...

echo Starting backend...
cd server
start cmd /k "npm run dev"
cd ..

timeout /t 3

echo Starting frontend...
start cmd /k "npm run dev"

echo Done! Backend: http://localhost:3000, Frontend: http://localhost:5173
pause
