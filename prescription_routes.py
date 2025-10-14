from flask import Blueprint, render_template, session, redirect, url_for, request, flash
from extensions import db
from models import Doctor, User, VideoCall, Prescription, Medication
from datetime import datetime

prescription = Blueprint('prescription', __name__)

@prescription.route('/doctor/prescriptions')
def doctor_dashboard():
    if 'doctor_id' not in session: return redirect(url_for('auth.login'))
    doctor_id = session['doctor_id']
    subquery = db.session.query(Prescription.video_call_id)
    recent_calls = db.session.query(VideoCall, User).join(User, VideoCall.user_id == User.id).filter(
        VideoCall.doctor_id == doctor_id,
        VideoCall.status == 'Approved',
        VideoCall.scheduled_time < datetime.now(),
        VideoCall.id.notin_(subquery)
    ).order_by(VideoCall.scheduled_time.desc()).limit(20).all()
    written_prescriptions = db.session.query(Prescription, User).join(User, Prescription.user_id == User.id).filter(
        Prescription.doctor_id == doctor_id
    ).order_by(Prescription.date_prescribed.desc()).all()
    return render_template('doctor_prescriptions.html', calls=recent_calls, prescriptions=written_prescriptions)

@prescription.route('/doctor/prescribe/<int:call_id>', methods=['GET', 'POST'])
def write_prescription(call_id):
    if 'doctor_id' not in session: return redirect(url_for('auth.login'))
    
    # --- FIX: Pass call and user objects separately to the template ---
    call_obj, user_obj = db.session.query(VideoCall, User).join(User, VideoCall.user_id == User.id).filter(VideoCall.id == call_id).first_or_404()
    
    if request.method == 'POST':
        notes = request.form.get('notes')
        med_names = request.form.getlist('med_name[]')
        med_dosages = request.form.getlist('med_dosage[]')
        med_frequencies = request.form.getlist('med_frequency[]')
        med_durations = request.form.getlist('med_duration[]')
        new_prescription = Prescription(user_id=call_obj.user_id, doctor_id=session['doctor_id'], video_call_id=call_id, notes=notes)
        db.session.add(new_prescription)
        for i in range(len(med_names)):
            if med_names[i]:
                medication = Medication(prescription=new_prescription, name=med_names[i], dosage=med_dosages[i], frequency=med_frequencies[i], duration=med_durations[i])
                db.session.add(medication)
        db.session.commit()
        flash('Prescription created successfully!', 'success')
        return redirect(url_for('prescription.doctor_dashboard'))
        
    return render_template('write_prescription.html', call=call_obj, user=user_obj)

@prescription.route('/user/prescriptions')
def user_prescriptions():
    if 'user_id' not in session: return redirect(url_for('auth.login'))
    prescriptions = db.session.query(Prescription, Doctor).join(Doctor, Prescription.doctor_id == Doctor.id).filter(
        Prescription.user_id == session['user_id']
    ).order_by(Prescription.date_prescribed.desc()).all()
    return render_template('user_prescriptions.html', prescriptions=prescriptions)

@prescription.route('/prescription/<int:prescription_id>')
def view_prescription(prescription_id):
    user_id = session.get('user_id')
    doctor_id = session.get('doctor_id')
    if not user_id and not doctor_id: return redirect(url_for('auth.login'))
    prescription = Prescription.query.get_or_404(prescription_id)
    if prescription.user_id != user_id and prescription.doctor_id != doctor_id: return redirect(url_for('main.home'))
    doctor = Doctor.query.get(prescription.doctor_id)
    user = User.query.get(prescription.user_id)
    return render_template('view_prescription.html', prescription=prescription, doctor=doctor, user=user)

# In prescription_routes.py

# ... (after the user_prescriptions function)

@prescription.route('/user/eprescriptions/view')
def user_eprescriptions_view_only():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    
    prescriptions = db.session.query(Prescription, Doctor).join(Doctor).filter(
        Prescription.user_id == session['user_id']
    ).order_by(Prescription.date_prescribed.desc()).all()
    
    return render_template('user_eprescriptions_list.html', prescriptions=prescriptions)