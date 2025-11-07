import os
from functools import wraps
from dotenv import load_dotenv
from flask import (
    Blueprint, render_template, request, redirect, url_for,
    session, flash, current_app
)
from models import db, Doctor

# Use a hard-to-guess prefix for security
admin_prefix = os.getenv('ADMIN_URL_PREFIX', '/admin')
admin = Blueprint('admin', __name__, url_prefix=admin_prefix)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('admin.login'))
        return f(*args, **kwargs)
    return decorated_function

@admin.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        admin_email = os.getenv('ADMIN_EMAIL')
        admin_password = os.getenv('ADMIN_PASSWORD')

        if email == admin_email and password == admin_password:
            session.clear()
            session['admin_logged_in'] = True
            return redirect(url_for('admin.dashboard'))
        else:
            flash('Invalid admin credentials.', 'error')
    return render_template('admin_login.html')

@admin.route('/dashboard')
@admin_required
def dashboard():
    pending_doctors = Doctor.query.filter_by(is_approved=False).all()
    return render_template('admin_dashboard.html', doctors=pending_doctors)

@admin.route('/approve/<int:doctor_id>', methods=['POST'])
@admin_required
def approve_doctor(doctor_id):
    doctor = Doctor.query.get_or_404(doctor_id)
    doctor.is_approved = True
    db.session.commit()
    flash(f'Dr. {doctor.full_name} has been approved.', 'success')
    return redirect(url_for('admin.dashboard'))

@admin.route('/reject/<int:doctor_id>', methods=['POST'])
@admin_required
def reject_doctor(doctor_id):
    doctor = Doctor.query.get_or_404(doctor_id)
    doctor_name = doctor.full_name
    
    upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
    for filename in [doctor.photo_filename, doctor.license_filename, doctor.id_filename]:
        if filename:
            file_path = os.path.join(upload_folder, filename)
            if os.path.isfile(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    current_app.logger.error(f"Error deleting file {file_path}: {e}")

    db.session.delete(doctor)
    db.session.commit()
    flash(f'Application for Dr. {doctor_name} was rejected and deleted.', 'success')
    return redirect(url_for('admin.dashboard'))

@admin.route('/logout')
def logout():
    session.pop('admin_logged_in', None)
    flash('You have been logged out.', 'success')
    return redirect(url_for('admin.login'))
