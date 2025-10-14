# doctor_routes.py
import os
from datetime import datetime
from flask import (
    Blueprint, render_template, session, redirect, url_for,
    request, flash, jsonify, current_app
)
from sqlalchemy.exc import SQLAlchemyError
# --- FIX: Import Notification model ---
from models import db, Doctor, Appointment, User, Notification

doctors = Blueprint('doctors', __name__)

@doctors.route('/find-doctors')
def find_doctors():
    if 'user_id' not in session and 'doctor_id' not in session:
        return redirect(url_for('auth.login'))

    all_doctors = Doctor.query.filter_by(is_approved=True).all()
    specializations = sorted(list(set(doc.specialization for doc in all_doctors)))
    return render_template('find-doctors.html', doctors=all_doctors, specializations=specializations)

# --- START: Updated Dashboard Route ---
@doctors.route('/doctor/dashboard')
def dashboard():
    if 'doctor_id' not in session:
        return redirect(url_for('auth.login'))
    
    # Fetch the doctor's object to pass its status to the template
    doctor = Doctor.query.get(session['doctor_id'])
    return render_template('index.html', doctor=doctor)
# --- END: Updated Dashboard Route ---

# --- START: New Route to Toggle Availability ---
@doctors.route('/doctor/availability/toggle', methods=['POST'])
def toggle_availability():
    if 'doctor_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    doctor = Doctor.query.get(session['doctor_id'])
    if not doctor:
        return jsonify({'error': 'Doctor not found'}), 404
        
    # Flip the boolean status
    doctor.is_available = not doctor.is_available
    db.session.commit()
    
    return jsonify({
        'message': 'Availability updated successfully.',
        'is_available': doctor.is_available
    })
# --- END: New Route ---

@doctors.route('/doctor/appointments')
def view_appointments():
    if 'doctor_id' not in session:
        return redirect(url_for('auth.login'))
    
    doctor_id = session['doctor_id']
    query = db.session.query(Appointment, User).join(User, Appointment.user_id == User.id).filter(Appointment.doctor_id == doctor_id).order_by(Appointment.appointment_datetime.asc())
    all_appointments = query.all()
    
    appointments_categorized = {
        'pending': [],
        'confirmed': [],
        'past_or_rejected': []
    }
    
    now = datetime.utcnow()
    for appt, user in all_appointments:
        if appt.status == 'Pending' and appt.appointment_datetime > now:
            appointments_categorized['pending'].append((appt, user))
        elif appt.status == 'Confirmed' and appt.appointment_datetime > now:
            appointments_categorized['confirmed'].append((appt, user))
        else:
            appointments_categorized['past_or_rejected'].append((appt, user))

    return render_template('doctor_appointments.html', appointments=appointments_categorized)

@doctors.route('/doctor/appointments/update/<int:appointment_id>', methods=['POST'])
def update_appointment_status(appointment_id):
    if 'doctor_id' not in session: return redirect(url_for('auth.login'))
    
    appointment = db.session.query(Appointment).filter_by(id=appointment_id).first_or_404()
    doctor = db.session.query(Doctor).filter_by(id=session['doctor_id']).first()

    if appointment.doctor_id != session['doctor_id']:
        flash('You are not authorized to modify this appointment.', 'error')
        return redirect(url_for('doctors.view_appointments'))

    action = request.form.get('action')
    if action == 'confirm':
        appointment.status = 'Confirmed'
        flash('Appointment confirmed successfully!', 'success')
        # --- START: Create notification for user ---
        notification_message = f"Dr. {doctor.full_name} has confirmed your appointment for {appointment.appointment_datetime.strftime('%b %d at %I:%M %p')}."
        new_notification = Notification(message=notification_message, recipient_user_id=appointment.user_id)
        db.session.add(new_notification)
        # --- END: Create notification for user ---
    elif action == 'reject':
        appointment.status = 'Rejected'
        flash('Appointment has been rejected.', 'success')
        # --- START: Create notification for user ---
        notification_message = f"Dr. {doctor.full_name} has rejected your appointment for {appointment.appointment_datetime.strftime('%b %d at %I:%M %p')}."
        new_notification = Notification(message=notification_message, recipient_user_id=appointment.user_id)
        db.session.add(new_notification)
        # --- END: Create notification for user ---
    
    db.session.commit()
    return redirect(url_for('doctors.view_appointments'))
# --- START: Updated Doctor Details API ---
@doctors.route('/doctor/<int:doctor_id>')
def get_doctor_details(doctor_id):
    if 'user_id' not in session and 'doctor_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    doctor = Doctor.query.get(doctor_id)
    if not doctor or not doctor.is_approved:
        return jsonify({'error': 'Doctor not found or not approved'}), 404

    doctor_data = {
        'id': doctor.id,
        'full_name': doctor.full_name,
        'specialization': doctor.specialization,
        'experience_years': doctor.experience_years,
        'qualifications': doctor.qualifications,
        'clinic_name': doctor.clinic_name,
        'clinic_address': doctor.clinic_address,
        'clinic_latitude': doctor.clinic_latitude,
        'clinic_longitude': doctor.clinic_longitude,
        'photo_filename': doctor.photo_filename,
        'is_available': doctor.is_available  # Include availability status
    }
    return jsonify(doctor_data)
# --- END: Updated Doctor Details API ---

# --- START: Updated Booking Route ---
@doctors.route('/doctor/book-appointment', methods=['POST'])
def book_appointment():
    if 'user_id' not in session:
        return jsonify({'error': 'User not logged in. Please log in to book.'}), 401
    
    user = User.query.get(session['user_id'])
    data = request.get_json()
    doctor_id = data.get('doctorId')
    
    doctor = Doctor.query.get(doctor_id)
    if not doctor or not doctor.is_available:
        return jsonify({'error': 'This doctor is currently unavailable for new appointments.'}), 400

    date_str = data.get('date')
    time_str = data.get('time')

    if not all([doctor_id, date_str, time_str]):
        return jsonify({'error': 'Missing required booking information.'}), 400

    try:
        datetime_str = f"{date_str} {time_str}"
        appointment_dt = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M')
        
        new_appointment = Appointment(
            user_id=session['user_id'],
            doctor_id=doctor_id,
            appointment_datetime=appointment_dt,
            status='Pending'
        )
        db.session.add(new_appointment)

        # --- START: Create notification for doctor ---
        notification_message = f"You have a new appointment request from {user.full_name} for {appointment_dt.strftime('%b %d at %I:%M %p')}."
        new_notification = Notification(message=notification_message, recipient_doctor_id=doctor_id)
        db.session.add(new_notification)
        # --- END: Create notification for doctor ---

        db.session.commit()
        return jsonify({'message': 'Appointment request submitted successfully!'}), 201
    except (ValueError, SQLAlchemyError):
        db.session.rollback()
        return jsonify({'error': 'Could not save the appointment.'}), 500

# ... (verify_account_password, doctor_account, delete_doctor_account routes are unchanged) ...
@doctors.route('/doctor/account/verify', methods=['GET', 'POST'])
def verify_account_password():
    if 'doctor_id' not in session:
        return redirect(url_for('auth.login'))
    if request.method == 'POST':
        password = request.form.get('password', '')
        doctor = Doctor.query.get(session['doctor_id'])
        if doctor and doctor.check_password(password):
            session['doctor_verified'] = True
            return redirect(url_for('doctors.doctor_account'))
        flash('Incorrect password. Please try again.', 'error')
    return render_template('doctor_verify.html')

@doctors.route('/doctor/account')
def doctor_account():
    if 'doctor_id' not in session: return redirect(url_for('auth.login'))
    if not session.get('doctor_verified'): return redirect(url_for('doctors.verify_account_password'))

    doctor = Doctor.query.get(session['doctor_id'])
    if not doctor:
        flash('Doctor not found.', 'error')
        return redirect(url_for('auth.login'))
    
    photo_url = url_for('static', filename=f'uploads/{doctor.photo_filename}') if doctor.photo_filename else None
    license_url = url_for('static', filename=f'uploads/{doctor.license_filename}') if doctor.license_filename else None
    id_url = url_for('static', filename=f'uploads/{doctor.id_filename}') if doctor.id_filename else None

    return render_template(
        'doctor_account.html', doctor=doctor, photo_url=photo_url,
        license_url=license_url, id_url=id_url
    )

@doctors.route('/doctor/account/delete', methods=['POST'])
def delete_doctor_account():
    if 'doctor_id' not in session:
        return redirect(url_for('auth.login'))
    doctor = Doctor.query.get(session['doctor_id'])
    if doctor:
        db.session.delete(doctor)
        db.session.commit()
        session.clear()
        flash('Your doctor account has been permanently deleted.', 'success')
    return redirect(url_for('auth.login'))

