@echo off
pushd "%~dp0"
start "Sudoku Dev" cmd /k ""C:\Program Files\nodejs\npm.cmd" run dev"
timeout /t 5 >nul
start "" http://localhost:5000
popd