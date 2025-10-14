from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify, current_app, flash, abort
import google.generativeai as genai
from extensions import db
from models import Appointment, Doctor, User, Notification, VideoCall
from sqlalchemy import or_
from flask import send_from_directory

# --- Imports for Image Processing ---
import base64
from PIL import Image
import io

main = Blueprint('main', __name__)

@main.route('/')
def home():
    if 'user_id' not in session and 'doctor_id' not in session:
        return redirect(url_for('auth.login'))
    return render_template('index.html')

# --- START: UPDATED /prompt ROUTE ---
@main.route('/prompt', methods=['POST'])
def handle_prompt():
    if 'user_id' not in session and 'doctor_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    prompt_text = data.get('prompt')
    base64_images = data.get('images', [])

    api_key = current_app.config.get('GOOGLE_API_KEY')

    if not api_key:
        return jsonify({'error': 'Google API key is not configured on the server.'}), 500
    if not prompt_text and not base64_images:
        return jsonify({'error': 'A text prompt or an image is required.'}), 400

    try:
        genai.configure(api_key=api_key)

        # === CONDITIONAL LOGIC ===
        if not base64_images:
            # --- YOUR ORIGINAL TEXT-ONLY LOGIC ---
            if not prompt_text:
                return jsonify({'error': 'Prompt is required'}), 400
                
            model = genai.GenerativeModel("gemini-2.5-flash-lite")
            
            system_instruction = (
                "You are MediBot, a helpful AI medical assistant. "
                "Your primary role is to answer only medical, health, and wellness-related questions. "
                "You must strictly and politely refuse to answer any questions that are not related to these topics. "
                "If asked a non-medical question, you must decline by stating your purpose, for example: "
                "'As a medical assistant, I can only answer questions about health and medicine.'"
            )
            
            full_prompt = f"{system_instruction}\n\nUser Question: {prompt_text}"
            response = model.generate_content(full_prompt)

        else:
            # --- NEW MULTIMODAL (IMAGE) LOGIC ---
            model = genai.GenerativeModel("gemini-2.5-flash")
            
            system_instruction = (
                "You are MediBot, a helpful AI medical assistant. Your primary role is to answer "
                "only medical, health, and wellness-related questions, especially in relation to any "
                "images provided. You must strictly and politely refuse to answer any questions that "
                "are not related to these topics."
            )

            content_parts = [system_instruction]
            if prompt_text:
                content_parts.append(prompt_text)

            for b64_string in base64_images:
                try:
                    image_bytes = base64.b64decode(b64_string)
                    img = Image.open(io.BytesIO(image_bytes))
                    content_parts.append(img)
                except Exception as e:
                    current_app.logger.error(f"Could not process a Base64 image: {e}")
                    continue

            if len(content_parts) <= (1 + (1 if prompt_text else 0)):
                return jsonify({'error': 'Invalid or corrupted image data provided.'}), 400
            
            response = model.generate_content(content_parts)
            
        return jsonify({'response': response.text})
        
    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': 'An error occurred while communicating with the AI model.'}), 500
# --- END: UPDATED /prompt ROUTE ---


# --- START: SECURE VIDEO CALL ROUTE ---
@main.route('/call/<int:call_id>')
def call_page(call_id):
    user_id = session.get('user_id')
    doctor_id = session.get('doctor_id')

    if not user_id and not doctor_id:
        flash("You must be logged in to join a call.", "error")
        return redirect(url_for('auth.login'))

    call = VideoCall.query.get_or_404(call_id)

    # Security Check 1: Is the current user/doctor part of this call?
    if call.user_id != user_id and call.doctor_id != doctor_id:
        abort(403)  # Forbidden access

    # Security Check 2: Is the call approved?
    if call.status != 'Approved':
        flash('This call has not been approved or has been cancelled.', 'error')
        return redirect(url_for('main.home'))

    return render_template('call.html', call_id=call.id)
# --- END: SECURE VIDEO CALL ROUTE ---


@main.route('/notifications')
def get_notifications():
    if 'user_id' not in session and 'doctor_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    query = Notification.query.filter_by(is_read=False)
    if 'user_id' in session:
        query = query.filter_by(recipient_user_id=session['user_id'])
    elif 'doctor_id' in session:
        query = query.filter_by(recipient_doctor_id=session['doctor_id'])
    notifications = query.order_by(Notification.timestamp.desc()).all()
    return jsonify({
        'count': len(notifications),
        'notifications': [{'id': n.id, 'message': n.message} for n in notifications]
    })


@main.route('/notifications/read', methods=['POST'])
def mark_notifications_read():
    if 'user_id' not in session and 'doctor_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    if 'user_id' in session:
        Notification.query.filter_by(is_read=False, recipient_user_id=session['user_id']).update({'is_read': True})
    elif 'doctor_id' in session:
        Notification.query.filter_by(is_read=False, recipient_doctor_id=session['doctor_id']).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'Notifications marked as read.'}), 200


@main.route('/appointment-status')
def appointment_status():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))
    user_id = session['user_id']
    user_appointments = db.session.query(Appointment, Doctor)\
        .join(Doctor, Appointment.doctor_id == Doctor.id)\
        .filter(Appointment.user_id == user_id)\
        .order_by(Appointment.appointment_datetime.desc())\
        .all()
    return render_template('appointment_status.html', appointments=user_appointments)


@main.route('/appointment/cancel/<int:appointment_id>', methods=['POST'])
def cancel_appointment(appointment_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required.'}), 401
    user = User.query.get(session['user_id'])
    appointment = Appointment.query.get_or_404(appointment_id)
    if appointment.user_id != session['user_id']:
        return jsonify({'error': 'You are not authorized to cancel this appointment.'}), 403
    appointment.status = 'Cancelled'
    notification_message = f"{user.full_name} has cancelled their appointment scheduled for {appointment.appointment_datetime.strftime('%b %d at %I:%M %p')}."
    new_notification = Notification(message=notification_message, recipient_doctor_id=appointment.doctor_id)
    db.session.add(new_notification)
    db.session.commit()
    return jsonify({'message': 'Appointment successfully cancelled.'}), 200


# --- Other utility routes ---
@main.route('/picker/map')
def picker_map():
    return render_template('picker_map.html')

@main.route('/view/map')
def view_map():
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    return render_template('view_map.html', lat=lat, lng=lng)

@main.route('/directions/map')
def directions_map():
    dest_lat = request.args.get('dlat')
    dest_lng = request.args.get('dlng')
    return render_template('directions_map.html', dest_lat=dest_lat, dest_lng=dest_lng)



# Add this inside main_routes.py, with the other routes

@main.route('/manifest.json')
def serve_manifest():
    return send_from_directory('static', 'manifest.json')

@main.route('/sw.js')
def serve_sw():
    return send_from_directory('static', 'sw.js')