from flask import Blueprint, render_template, session, redirect, url_for, request, flash, jsonify
from models import db, Doctor, User, VideoCall
from datetime import datetime, timedelta
from flask_mail import Message
from extensions import mail
import os

video_call = Blueprint('video_call', __name__)

# API endpoint for a user to request a call
# API endpoint for a user to request a call
@video_call.route('/call/request/doctor/<int:doctor_id>', methods=['POST'])
def request_call(doctor_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Please log in to request a call.'}), 401

    data = request.get_json()
    date_str = data.get('date')
    time_str = data.get('time')
    user_id = session['user_id']
    
    if not all([date_str, time_str]):
        return jsonify({'error': 'Date and time are required.'}), 400

    try:
        scheduled_time = datetime.strptime(f"{date_str} {time_str}", '%Y-%m-%d %H:%M')
        
        new_call = VideoCall(
            user_id=user_id,
            doctor_id=doctor_id,
            scheduled_time=scheduled_time,
            status='Pending'
        )
        db.session.add(new_call)
        db.session.commit()

        # --- Email Notifications ---
        user = User.query.get(user_id)
        doctor = Doctor.query.get(doctor_id)
        sender_email = os.getenv('MAIL_USERNAME')

        # Mail to Doctor
        msg_doc = Message('New Video Call Request', sender=sender_email, recipients=[doctor.email])
        msg_doc.body = f"Hello Dr. {doctor.full_name},\n\nYou have received a new video call request from {user.full_name} for {scheduled_time.strftime('%B %d, %Y at %I:%M %p')}.\nPlease log in to your dashboard to approve or reject it."
        
        print("--- DEBUG: Attempting to send email to doctor ---")
        mail.send(msg_doc)
        print("--- DEBUG: Doctor email sent successfully ---")

        # Mail to User
        msg_user = Message('Your Video Call Request has been Sent', sender=sender_email, recipients=[user.email])
        msg_user.body = f"Hello {user.full_name},\n\nYour video call request to Dr. {doctor.full_name} for {scheduled_time.strftime('%B %d, %Y at %I:%M %p')} has been sent. You will be notified once the doctor responds."

        print("--- DEBUG: Attempting to send email to user ---")
        mail.send(msg_user)
        print("--- DEBUG: User email sent successfully ---")

        return jsonify({'message': 'Call request sent successfully!'}), 201

    except Exception as e:
        db.session.rollback()
        print(f"--- DEBUG: AN ERROR OCCURRED! Error: {e} ---")
        return jsonify({'error': str(e)}), 500

# Page for the DOCTOR to see their call requests
# In video_call_routes.py

# Page for the DOCTOR to see their call requests
@video_call.route('/doctor/calls')
def view_call_requests():
    if 'doctor_id' not in session:
        return redirect(url_for('auth.login'))
    
    doctor_id = session['doctor_id']
    
    pending_calls = db.session.query(VideoCall, User).join(User).filter(VideoCall.doctor_id == doctor_id, VideoCall.status == 'Pending').order_by(VideoCall.scheduled_time.asc()).all()
    approved_calls = db.session.query(VideoCall, User).join(User).filter(VideoCall.doctor_id == doctor_id, VideoCall.status == 'Approved').order_by(VideoCall.scheduled_time.asc()).all()

    # --- FIX: Pass 'now' and 'timedelta' to the doctor's template ---
    return render_template('doctor_call_list.html', pending_calls=pending_calls, approved_calls=approved_calls, now=datetime.now(), timedelta=timedelta)

# Page for the USER to see the status of their calls
# Page for the USER to see the status of their calls
@video_call.route('/user/calls')
def user_call_status():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    user_id = session['user_id']
    calls = db.session.query(VideoCall, Doctor).join(Doctor).filter(VideoCall.user_id == user_id).order_by(VideoCall.scheduled_time.desc()).all()
    
    # --- FIX: Change utcnow() to now() ---
    return render_template('user_call_status.html', calls=calls, now=datetime.now(), timedelta=timedelta)
# Endpoint for the DOCTOR to approve or reject a call
@video_call.route('/call/update/<int:call_id>', methods=['POST'])
def update_call_status(call_id):
    if 'doctor_id' not in session:
        return redirect(url_for('auth.login'))

    call = VideoCall.query.get_or_404(call_id)
    if call.doctor_id != session['doctor_id']:
        flash('Unauthorized.', 'error')
        return redirect(url_for('video_call.view_call_requests'))

    action = request.form.get('action')
    if action in ['Approved', 'Rejected']:
        call.status = action
        db.session.commit()

        # --- Email Notification to User ---
        user = User.query.get(call.user_id)
        doctor = Doctor.query.get(call.doctor_id)
        sender_email = os.getenv('MAIL_USERNAME')
        
        msg = Message(f'Your Video Call Request has been {action}', sender=sender_email, recipients=[user.email])
        msg.body = f"Hello {user.full_name},\n\nYour video call request with Dr. {doctor.full_name} for {call.scheduled_time.strftime('%B %d, %Y at %I:%M %p')} has been {action}."
        mail.send(msg)

        flash(f'Call has been {action.lower()}.', 'success')
    return redirect(url_for('video_call.view_call_requests'))