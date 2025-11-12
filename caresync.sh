#!/bin/bash
# ==============================
# CareSync Startup Script
# ==============================

echo "Starting CareSync Server..."

cd caresync
# Step 1: Activate virtual environment
source venv/bin/activate

# Step 2: Import blood bank data
python3 import_blood_banks.py

# Step 3: Start Flask app in background
nohup python3 app.py > app.log 2>&1 &

# Step 4: Wait a few seconds
sleep 5

# Step 5: Start ngrok tunnel
nohup ngrok http https://127.0.0.1:5000 > ngrok.log 2>&1 &

echo "Flask and ngrok are running!"

# Wait for user to press Ctrl+C
echo "CareSync running. Press Ctrl+C to stop everything."

trap 'echo "Stopping..."; kill $FLASK_PID; pkill ngrok; deactivate; exit 0' INT

# Keep the terminal open
wait