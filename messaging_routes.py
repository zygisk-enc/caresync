from flask import Blueprint, render_template, session, redirect, url_for, jsonify, abort
from sqlalchemy import or_
from models import db, User, Doctor, Conversation, Message

messaging = Blueprint('messaging', __name__)

# --- Route for the Doctor's list of chats ---
@messaging.route('/chats')
def list_chats():
    if 'doctor_id' not in session:
        abort(403) # Forbidden for non-doctors
    
    doctor_id = session['doctor_id']
    conversations_with_users = db.session.query(Conversation, User).join(
        User, User.id == Conversation.user_id
    ).filter(
        Conversation.doctor_id == doctor_id
    ).order_by(Conversation.timestamp.desc()).all()

    return render_template('doctor_chat_list.html', conversations=conversations_with_users)

# --- Route to open a full-page chat (for doctors or users) ---
@messaging.route('/chat/<int:recipient_id>')
def chat_with_recipient(recipient_id):
    if 'user_id' not in session and 'doctor_id' not in session:
        return redirect(url_for('auth.login'))

    user_id = session.get('user_id')
    doctor_id = session.get('doctor_id')

    # Determine who is who
    if user_id: # Current user is a patient
        recipient = Doctor.query.get_or_404(recipient_id)
        convo_user_id = user_id
        convo_doctor_id = recipient_id
    else: # Current user is a doctor
        recipient = User.query.get_or_404(recipient_id)
        convo_user_id = recipient_id
        convo_doctor_id = doctor_id

    # Find or create a conversation
    conversation = Conversation.query.filter(
        (Conversation.user_id == convo_user_id) & (Conversation.doctor_id == convo_doctor_id)
    ).first()

    if not conversation:
        conversation = Conversation(user_id=convo_user_id, doctor_id=convo_doctor_id)
        db.session.add(conversation)
        db.session.commit()
    
    return render_template('chat.html', recipient=recipient, conversation_id=conversation.id)


# --- API endpoint to get chat history ---
@messaging.route('/api/chat_history/<int:conversation_id>')
def get_chat_history(conversation_id):
    user_id = session.get('user_id')
    doctor_id = session.get('doctor_id')

    if not user_id and not doctor_id:
        return jsonify({"error": "Unauthorized"}), 401

    conversation = Conversation.query.get_or_404(conversation_id)

    # Security check: Ensure the current user is part of this conversation
    if (user_id != conversation.user_id and doctor_id != conversation.doctor_id):
        return jsonify({"error": "Forbidden"}), 403

    messages = Message.query.filter_by(conversation_id=conversation_id).order_by(Message.timestamp.asc()).all()
    
    # Return message data as a list of dictionaries
    return jsonify([msg.to_dict() for msg in messages])