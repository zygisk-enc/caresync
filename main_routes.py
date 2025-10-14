import os
import uuid
import base64
import io
from datetime import datetime

from flask import (
    Blueprint, render_template, session, redirect, url_for,
    request, jsonify, current_app, flash, abort, send_from_directory
)
from sqlalchemy import or_
import google.generativeai as genai
from PIL import Image, ImageDraw, ImageFont
from pdf2image import convert_from_bytes

from extensions import db
from models import Appointment, Doctor, User, Notification, VideoCall

main = Blueprint('main', __name__)

@main.route('/')
def home():
    if 'user_id' not in session and 'doctor_id' not in session:
        return redirect(url_for('auth.login'))
    return render_template('index.html')

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

        if not base64_images:
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

@main.route('/call/<int:call_id>')
def call_page(call_id):
    user_id = session.get('user_id')
    doctor_id = session.get('doctor_id')

    if not user_id and not doctor_id:
        flash("You must be logged in to join a call.", "error")
        return redirect(url_for('auth.login'))

    call = VideoCall.query.get_or_404(call_id)

    if call.user_id != user_id and call.doctor_id != doctor_id:
        abort(403)

    if call.status != 'Approved':
        flash('This call has not been approved or has been cancelled.', 'error')
        return redirect(url_for('main.home'))

    return render_template('call.html', call_id=call.id)

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

# In main_routes.py

# In main_routes.py, find and replace your existing handle_secure_upload function:

@main.route('/call/<int:call_id>/upload', methods=['POST'])
def handle_secure_upload(call_id):
    temp_folder = os.path.join(current_app.root_path, 'temp_uploads')
    os.makedirs(temp_folder, exist_ok=True)

    if 'user_id' not in session and 'doctor_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    call = VideoCall.query.get_or_404(call_id)
    user_id = session.get('user_id')
    doctor_id = session.get('doctor_id')

    if call.user_id != user_id and call.doctor_id != doctor_id:
        return jsonify({'error': 'Forbidden'}), 403

    if 'document' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['document']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if 'user_id' in session:
        viewer = Doctor.query.get(call.doctor_id)
        viewer_name = f"Dr. {viewer.full_name}"
    else:
        viewer = User.query.get(call.user_id)
        viewer_name = viewer.full_name

    # MODIFIED: Watermark text for multiple diagonals
    watermark_base_text = f"Viewed by {viewer_name} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    
    processed_urls = []
    
    try:
        file_bytes = file.read()
        images_to_watermark = []

        if file.mimetype == 'application/pdf':
            images_to_watermark = convert_from_bytes(file_bytes)
        elif file.mimetype.startswith('image/'):
            images_to_watermark.append(Image.open(io.BytesIO(file_bytes)).convert("RGBA"))

        for image in images_to_watermark:
            img_width, img_height = image.size
            txt_layer = Image.new('RGBA', (img_width, img_height), (255, 255, 255, 0))
            draw = ImageDraw.Draw(txt_layer)

            try:
                # Attempt to load a common bold font, adjust size for better visibility
                font_size = int(img_width / 15) # Dynamic font size based on image width
                font = ImageFont.truetype("arialbd.ttf", font_size) # Arial Bold
            except IOError:
                font = ImageFont.load_default() # Fallback

            # MODIFIED: Darker grey (RGB 50, 50, 50) with some transparency (alpha 120-150 for good visibility)
            # Alpha value depends on how subtle/prominent you want it. 120-150 is a good range.
            watermark_fill = (50, 50, 50, 140) 

            # Calculate text size once to help with positioning
            bbox = draw.textbbox((0, 0), watermark_base_text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]

            # MODIFIED: Define multiple positions for diagonal watermarks
            # This creates a grid-like diagonal pattern
            positions = [
                (-text_width / 2, img_height / 4 - text_height / 2), # Top-left quadrant
                (img_width / 4, -text_height / 2),                   # Top-center (start off-screen for effect)
                (img_width / 2 - text_width / 2, img_height / 2 - text_height / 2), # Center
                (img_width * 3 / 4, img_height - text_height * 0.75),# Bottom-right (start off-screen for effect)
                (img_width - text_width / 2, img_height / 4),       # Top-right quadrant
                (img_width / 2, img_height * 3 / 4 - text_height / 2), # Bottom-center quadrant
                (-text_width / 2, img_height * 3 / 4),               # Bottom-left quadrant
                # Add more if you want a denser pattern
            ]

            for x, y in positions:
                # Rotate the text for diagonal effect
                # Create a temporary image for the rotated text
                temp_text_img = Image.new('RGBA', (text_width + 50, text_height + 50), (255, 255, 255, 0))
                temp_draw = ImageDraw.Draw(temp_text_img)
                temp_draw.text((0, 0), watermark_base_text, font=font, fill=watermark_fill)
                
                # Rotate by -45 degrees (adjust angle as needed)
                rotated_text_img = temp_text_img.rotate(45, expand=1) # expand=1 ensures full text is visible after rotation
                
                # Paste the rotated text onto the main text layer, adjusting for rotation expansion
                # We need to calculate the new top-left corner after rotation expansion
                rotated_width, rotated_height = rotated_text_img.size
                
                # Adjust paste position to roughly center the rotated text around original (x,y)
                paste_x = int(x - (rotated_width - text_width) / 2)
                paste_y = int(y - (rotated_height - text_height) / 2)

                txt_layer.paste(rotated_text_img, (paste_x, paste_y), rotated_text_img)

            watermarked_image = Image.alpha_composite(image.convert('RGBA'), txt_layer)

            filename = f"call_{call_id}_{uuid.uuid4().hex}.png"
            filepath = os.path.join(temp_folder, filename)
            watermarked_image.convert('RGB').save(filepath, 'PNG')
            processed_urls.append(url_for('main.serve_temp_file', filename=filename, _external=True))
            
        return jsonify({'urls': processed_urls})

    except Exception as e:
        current_app.logger.error(f"File processing error: {e}")
        return jsonify({'error': 'Failed to process file'}), 500

@main.route('/temp-uploads/<filename>')
def serve_temp_file(filename):
    temp_folder = os.path.join(current_app.root_path, 'temp_uploads')
    
    if not (filename.startswith('call_') and filename.endswith('.png')):
        abort(404)
    return send_from_directory(temp_folder, filename)

# --- Utility and PWA routes ---
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

@main.route('/manifest.json')
def serve_manifest():
    return send_from_directory('static', 'manifest.json')

@main.route('/sw.js')
def serve_sw():
    return send_from_directory('static', 'sw.js')