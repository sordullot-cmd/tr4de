@echo off
REM Launch Python MT5 API Server
REM Make sure you have installed: pip install MetaTrader5 flask flask-cors

echo.
echo Starting MetaTrader 5 Python API Server...
echo.

cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Download Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Install required packages if needed
echo Installing/checking Python packages...
pip install MetaTrader5 flask flask-cors -q
if errorlevel 1 (
    echo ERROR: Failed to install Python packages
    pause
    exit /b 1
)

REM Launch the API
echo.
echo ^> python mt5_api.py
echo.
python mt5_api.py

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start MT5 API Server
    echo Make sure MetaTrader 5 is running and connected to Vantage
    pause
)
