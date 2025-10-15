from flask import Blueprint, session, jsonify, abort, render_template, redirect, url_for
from sqlalchemy import func
from extensions import db
from models import User, Appointment, VideoCall, Prescription, PromptHistory

# Create a new blueprint for the dashboard feature
dashboard = Blueprint('dashboard', __name__)

# Route to render the main dashboard page
@dashboard.route('/dashboard')
def view_dashboard():
    """Renders the main health dashboard page."""
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    user = User.query.get(session['user_id'])
    return render_template('dashboard.html', user=user)

# API endpoint to fetch all data needed for the dashboard
@dashboard.route('/api/dashboard-data')
def get_dashboard_data():
    """
    Fetches and aggregates all health data for the logged-in user,
    including KPIs, chart data, and AI prompt history.
    """
    if 'user_id' not in session:
        abort(401) # Unauthorized

    user_id = session['user_id']

    # --- 1. Fetch Data for KPI Cards ---
    total_appointments = Appointment.query.filter_by(user_id=user_id).count()
    total_video_calls = VideoCall.query.filter_by(user_id=user_id).count()
    # FIX: Define total_prescriptions as a local variable first
    total_prescriptions = Prescription.query.filter_by(user_id=user_id).count()

    kpis = {
        'totalAppointments': total_appointments,
        'totalVideoCalls': total_video_calls,
        'totalPrescriptions': total_prescriptions, # Now using the defined variable
    }

    # --- 2. Fetch Data for the Pie Chart ---
    appointment_statuses = db.session.query(
        Appointment.status, func.count(Appointment.status)
    ).filter_by(user_id=user_id).group_by(Appointment.status).all()

    call_statuses = db.session.query(
        VideoCall.status, func.count(VideoCall.status)
    ).filter_by(user_id=user_id).group_by(VideoCall.status).all()

    chart_data = {
        'Approved': 0,
        'Pending': 0,
        'Rejected/Cancelled': 0,
        # FIX: Now correctly uses the defined local variable
        'Prescriptions Issued': total_prescriptions
    }

    for status, count in appointment_statuses:
        if status in ['Confirmed', 'Approved']:
            chart_data['Approved'] += count
        elif status == 'Pending':
            chart_data['Pending'] += count
        elif status in ['Rejected', 'Cancelled']:
            chart_data['Rejected/Cancelled'] += count
            
    for status, count in call_statuses:
        if status == 'Approved':
            chart_data['Approved'] += count
        elif status == 'Pending':
            chart_data['Pending'] += count
        elif status == 'Rejected':
            chart_data['Rejected/Cancelled'] += count

    # --- 3. Fetch AI Prompt History ---
    prompts = PromptHistory.query.filter_by(user_id=user_id).order_by(PromptHistory.timestamp.desc()).limit(10).all()
    prompt_history = []
    for p in prompts:
        prompt_history.append({
            'prompt': p.prompt_text,
            'response': p.response_text,
            'image_url': p.image_url,
            'timestamp': p.timestamp.isoformat()
        })

    # --- 4. Assemble and Return Final JSON Response ---
    return jsonify({
        'kpis': kpis,
        'chartData': chart_data,
        'promptHistory': prompt_history
    })