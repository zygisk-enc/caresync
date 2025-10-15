from flask import Blueprint, session, jsonify, abort, render_template, redirect, url_for
from extensions import db
from models import User, Doctor, Appointment, VideoCall, Prescription

# Create a new blueprint for the health history feature
history = Blueprint('history', __name__)

@history.route('/api/patient/<int:user_id>/history')
def get_patient_history(user_id):
    """
    Fetches and combines appointments, video calls, and prescriptions
    for a given patient into a single, sorted timeline.
    """
    
    # --- 1. Security Check: Ensure the requester is authorized ---
    is_patient_self = session.get('user_id') == user_id
    
    is_authorized_doctor = False
    if 'doctor_id' in session:
        doctor_id = session.get('doctor_id')
        # Check for any past or present appointment OR video call with this patient
        interaction_exists = db.session.query(
            db.or_(
                Appointment.query.filter_by(user_id=user_id, doctor_id=doctor_id).exists(),
                VideoCall.query.filter_by(user_id=user_id, doctor_id=doctor_id).exists()
            )
        ).scalar()
        if interaction_exists:
            is_authorized_doctor = True

    if not is_patient_self and not is_authorized_doctor:
        abort(403) # Forbidden access if not authorized

    # --- 2. Query Database for All Event Types ---
    timeline_events = []

    # Get Appointments
    appointments = db.session.query(Appointment, Doctor.full_name).join(Doctor).filter(Appointment.user_id == user_id).all()
    for appt, doctor_name in appointments:
        timeline_events.append({
            'date': appt.appointment_datetime.isoformat(),
            'type': 'Appointment',
            'title': f"Appointment with Dr. {doctor_name}",
            'status': appt.status,
            'details': f"Status: {appt.status}"
        })

    # Get Video Calls
    video_calls = db.session.query(VideoCall, Doctor.full_name).join(Doctor).filter(VideoCall.user_id == user_id).all()
    for call, doctor_name in video_calls:
        timeline_events.append({
            'date': call.scheduled_time.isoformat(),
            'type': 'Video Call',
            'title': f"Video Call with Dr. {doctor_name}",
            'status': call.status,
            'details': f"Status: {call.status}"
        })
        
    # Get Prescriptions
    prescriptions = Prescription.query.filter_by(user_id=user_id).all()
    for rx in prescriptions:
        med_count = len(rx.medications)
        med_text = f"{med_count} medication" + ("s" if med_count != 1 else "")
        timeline_events.append({
            'date': rx.date_prescribed.isoformat(),
            'type': 'Prescription',
            'title': f"Prescription from Dr. {rx.doctor.full_name}",
            'status': 'Issued',
            'details': f"Contains {med_text}.",
            'id': rx.id # Include ID to link to the details page
        })

    # --- 3. Sort and Return the Combined Timeline ---
    
    # Sort all events by date, with the most recent first
    sorted_timeline = sorted(timeline_events, key=lambda event: event['date'], reverse=True)
    
    return jsonify(sorted_timeline)

@history.route('/health-timeline')
def health_timeline():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    # We pass the user object to the template
    user = User.query.get(session['user_id'])
    return render_template('health_timeline.html', user=user)