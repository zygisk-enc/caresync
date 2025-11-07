@echo off
REM --- CareSync Project Startup Script ---

REM 1. Check for the virtual environment and activate it
echo Activating virtual environment...
if exist venv\Scripts\activate.bat (
call venv\Scripts\activate.bat
) else (
echo.
echo ERROR: Virtual environment not found. Please create one using 'python -m venv venv' and install dependencies.
echo.
pause
exit /b 1
)

REM 2. Run the blood bank import script (runs once on startup)
echo.
echo Importing blood bank data (if necessary)...
python import_blood_banks.py

REM 3. Run the main Flask application (app.py)
echo.
echo Starting Flask application...
python app.py

REM 4. Deactivate the virtual environment (This line is generally not reached because app.py runs indefinitely,
REM    but it's good practice for when the server stops.)
echo.
echo Deactivating virtual environment...
deactivate

pause