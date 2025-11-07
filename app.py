import os
import atexit
import glob
from flask import Flask, session, request, current_app
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_migrate import Migrate
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
import os
from dotenv import load_dotenv
 # make sure environment vars are loaded

load_dotenv()

from extensions import db, mail
from models import Message
from scheduler import send_call_reminders, send_medication_reminders

app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))

# --- App Configuration ---
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['GOOGLE_API_KEY'] = os.getenv('GOOGLE_API_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'caresync.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() in ['true', 'on', '1']
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')

# --- Initialize Extensions ---
db.init_app(app)
mail.init_app(app)
migrate = Migrate(app, db)
socketio = SocketIO(app)

# --- Import and Register Blueprints ---
from auth_routes import auth as auth_blueprint
from main_routes import main as main_blueprint
from doctor_routes import doctors as doctor_blueprint
from admin_routes import admin as admin_blueprint
from messaging_routes import messaging as messaging_blueprint
from video_call_routes import video_call as video_call_blueprint
from blood_bank_routes import blood_bank as blood_bank_blueprint
from prescription_routes import prescription as prescription_blueprint
from reminder_routes import reminder as reminder_blueprint
from history_routes import history as history_blueprint
# ADDED: Import for the new dashboard blueprint
from dashboard_routes import dashboard as dashboard_blueprint

app.register_blueprint(auth_blueprint)
app.register_blueprint(main_blueprint)
app.register_blueprint(doctor_blueprint)
app.register_blueprint(admin_blueprint)
app.register_blueprint(messaging_blueprint)
app.register_blueprint(video_call_blueprint)
app.register_blueprint(blood_bank_blueprint)
app.register_blueprint(prescription_blueprint)
app.register_blueprint(reminder_blueprint)
app.register_blueprint(history_blueprint)
# ADDED: Register the new dashboard blueprint
app.register_blueprint(dashboard_blueprint)

# --- Socket.IO Event Handlers ---

@socketio.on('join_call_room')
def handle_join_call_room(data):
    call_id = data.get('call_id')
    if not call_id: return
    room = f"call_{call_id}"
    join_room(room)
    clients_in_room = list(socketio.server.manager.get_participants(request.namespace, room))
    if len(clients_in_room) == 2:
        emit('peers_ready', {'initiator_sid': request.sid}, to=room)

@socketio.on('webrtc_signal')
def handle_webrtc_signal(data):
    call_id = data.get('call_id')
    if not call_id: return
    room = f"call_{call_id}"
    emit('webrtc_signal', {'from_sid': request.sid, 'payload': data.get('payload')}, to=room, include_self=False)

@socketio.on('share_document')
def handle_share_document(data):
    call_id = data.get('call_id')
    if not call_id: return
    room = f"call_{call_id}"
    emit('document_shared', {'urls': data.get('urls')}, to=room, include_self=False)

@socketio.on('leave_call_room')
def handle_leave_call_room(data):
    call_id = data.get('call_id')
    if not call_id: return
    room = f"call_{call_id}"
    leave_room(room)
    emit('peer_left', {'sid': request.sid}, to=room)
    with app.app_context():
        clients_in_room = list(socketio.server.manager.get_participants(request.namespace, room))
        if len(clients_in_room) == 0:
            temp_folder = os.path.join(current_app.root_path, 'temp_uploads')
            files_to_delete = glob.glob(os.path.join(temp_folder, f"call_{call_id}_*.png"))
            for f in files_to_delete:
                try:
                    os.remove(f)
                    print(f"--- CLEANUP: Deleted temporary file: {f} ---")
                except OSError as e:
                    print(f"--- ERROR: Failed to delete file {f}: {e} ---")

@socketio.on('disconnect')
def handle_disconnect():
    pass

@socketio.on('join_chat')
def handle_join_chat(data):
    conversation_id = data['conversation_id']
    room = f"chat_{conversation_id}"
    join_room(room)

@socketio.on('send_message')
def handle_send_message(data):
    with app.app_context():
        conversation_id = data['conversation_id']
        text = data['text']
        sender_type = data['sender_type']
        room = f'chat_{conversation_id}'
        new_message = Message(conversation_id=conversation_id, sender_type=sender_type, text=text)
        db.session.add(new_message)
        db.session.commit()
        emit('new_message', { 'conversation_id': conversation_id, 'text': text, 'sender_type': sender_type, 'timestamp': new_message.timestamp.isoformat() }, to=room, include_self=False)

# --- Scheduler Setup ---
scheduler = BackgroundScheduler()

def start_jobs(the_app):
    # register jobs once
    scheduler.add_job(send_call_reminders, "interval", seconds=60, args=[the_app])
    scheduler.add_job(send_medication_reminders, "interval", seconds=60, args=[the_app])
    scheduler.start()
    atexit.register(lambda: scheduler.shutdown(wait=False))

if __name__ == '__main__':
    from dotenv import load_dotenv
    load_dotenv()  # load .env once at runtime

    # only start jobs in the reloader's main process
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        start_jobs(app)

    certfile = os.getenv('SSL_CERTFILE')
    keyfile = os.getenv('SSL_KEYFILE')

    # Flask expects ssl_context, not certfile/keyfile
    ssl_context = None
    if certfile and keyfile:
        ssl_context = (certfile, keyfile)  # Werkzeug will load these

    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True,
        ssl_context=ssl_context
    )


