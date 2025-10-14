# auth_routes.py

import os
import re
from datetime import datetime

from flask import Blueprint, render_template, request, redirect, url_for, flash, session, current_app
from werkzeug.utils import secure_filename

from models import db, User, Doctor

auth = Blueprint('auth', __name__)

@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        # Doctor login
        doctor = Doctor.query.filter_by(email=email).first()
        if doctor and doctor.check_password(password):
            session.clear()
            session['doctor_id'] = doctor.id
            session['user_name'] = doctor.full_name
            return redirect(url_for('doctors.dashboard'))

        # User login
        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            session.clear()
            session['user_id'] = user.id
            session['user_name'] = user.full_name
            return redirect(url_for('main.home'))

        flash('Invalid email or password. Please try again.', 'error')
        return redirect(url_for('auth.login'))

    return render_template('login.html')


@auth.route('/register-options')
def register_options():
    return render_template('register-options.html')


@auth.route('/register-user', methods=['GET', 'POST'])
def register_user():
    if request.method == 'POST':
        # --- Form Validation ---
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        if password != confirm_password:
            flash('Passwords do not match. Please try again.', 'error')
            return redirect(url_for('auth.register_user'))

        if (
            not re.search(r"[A-Z]", password) or
            not re.search(r"[a-z]", password) or
            not re.search(r"[0-9]", password) or
            not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password) or
            len(password) < 8
        ):
            flash('Password must meet all complexity requirements.', 'error')
            return redirect(url_for('auth.register_user'))

        if User.query.filter_by(email=email).first():
            flash('Email address already registered.', 'error')
            return redirect(url_for('auth.register_user'))

        # --- Create User ---
        new_user = User(
            email=email,
            full_name=f"{request.form.get('first_name', '')} {request.form.get('last_name', '')}".strip(),
            age=request.form.get('age'),
            gender=request.form.get('gender'),
            phone=request.form.get('phone'),
            address=request.form.get('address')
        )
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()

        flash('Registration successful! Please log in.', 'success')
        return redirect(url_for('auth.login'))

    return render_template('register-user.html')


@auth.route('/register-doctor', methods=['GET', 'POST'])
def register_doctor():
    if request.method == 'POST':
        email = request.form.get('doc_email')
        password = request.form.get('doc_password')
        confirm_password = request.form.get('doc_confirm_password')

        # Password checks
        if password != confirm_password:
            flash('Passwords do not match.', 'error')
            return redirect(request.url)
        if len(password) < 8:
            flash('Password must be at least 8 characters long.', 'error')
            return redirect(request.url)

        # Unique email
        if Doctor.query.filter_by(email=email).first():
            flash('This email is already registered.', 'error')
            return redirect(request.url)

        # Required uploads
        license_file = request.files.get('doc_license_upload')
        id_file = request.files.get('doc_id_upload')
        photo_file = request.files.get('doc_photo_upload')

        if not all([license_file, id_file, photo_file]):
            flash('Please upload all required documents (license, ID, and photo).', 'error')
            return redirect(request.url)

        # Secure filenames and save
        license_filename = secure_filename(license_file.filename)
        id_filename = secure_filename(id_file.filename)
        photo_filename = secure_filename(photo_file.filename)

        upload_folder = os.path.join(current_app.root_path, 'static/uploads')
        os.makedirs(upload_folder, exist_ok=True)

        license_file.save(os.path.join(upload_folder, license_filename))
        id_file.save(os.path.join(upload_folder, id_filename))
        photo_file.save(os.path.join(upload_folder, photo_filename))

        # Map coordinates (optional)
        clinic_latitude = request.form.get('clinic_latitude', type=float)
        clinic_longitude = request.form.get('clinic_longitude', type=float)

        # NEW: Date of Birth parsing from <input type="date" name="doc_dob">
        dob_str = request.form.get('doc_dob')  # HTML date input posts as YYYY-MM-DD
        dob = None
        if dob_str:
            try:
                dob = datetime.strptime(dob_str, '%Y-%m-%d').date()  # parse to date
            except ValueError:
                flash('Invalid date of birth format.', 'error')
                return redirect(request.url)

        # Create Doctor
        new_doctor = Doctor(
            full_name=request.form.get('doc_fullname'),
            email=email,
            phone=request.form.get('doc_phone'),
            license_number=request.form.get('doc_license'),
            specialization=request.form.get('doc_specialization'),
            qualifications=request.form.get('doc_qualifications'),
            clinic_name=request.form.get('doc_clinic'),
            experience_years=request.form.get('doc_experience'),
            clinic_address=request.form.get('doc_address'),
            clinic_latitude=clinic_latitude,
            clinic_longitude=clinic_longitude,
            license_filename=license_filename,
            id_filename=id_filename,
            photo_filename=photo_filename,
            dob=dob  # store parsed date
        )
        new_doctor.set_password(password)

        db.session.add(new_doctor)
        db.session.commit()

        flash(f"Thank you, {new_doctor.full_name}. Your application is under review.", 'success')
        return redirect(url_for('auth.login'))

    return render_template('register-doctor.html')


@auth.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'success')
    return redirect(url_for('auth.login'))


@auth.route('/account')
def account():
    # Protect the route for logged-in users only
    if 'user_id' not in session:
        # If a doctor is logged in, redirect to their dashboard
        if 'doctor_id' in session:
            return redirect(url_for('doctors.dashboard'))
        return redirect(url_for('auth.login'))

    # Get the current user from the database
    user = User.query.get(session['user_id'])
    if not user:
        flash('User not found.', 'error')
        return redirect(url_for('auth.login'))

    return render_template('account.html', user=user)


@auth.route('/account/delete', methods=['POST'])
def delete_account():
    # Check if a user is logged in
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    # Find the user in the database
    user = User.query.get(session['user_id'])
    if user:
        db.session.delete(user)
        db.session.commit()
        session.clear()
        flash('Your account has been permanently deleted.', 'success')
        return redirect(url_for('auth.login'))

    flash('An error occurred while deleting your account.', 'error')
    return redirect(url_for('auth.account'))
