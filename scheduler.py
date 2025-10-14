from datetime import datetime, timedelta, date
from extensions import db, mail
from models import VideoCall, User, Doctor, Reminder, Medication
from flask_mail import Message
import os

def send_call_reminders(app):
    with app.app_context():
        now = datetime.now()
        reminder_window_start = now + timedelta(minutes=1)
        reminder_window_end = now + timedelta(minutes=2)
        calls_to_remind = VideoCall.query.filter(
            VideoCall.status == 'Approved',
            VideoCall.reminder_sent == False,
            VideoCall.scheduled_time >= reminder_window_start,
            VideoCall.scheduled_time < reminder_window_end
        ).all()
        if not calls_to_remind: return
        sender_email = os.getenv('MAIL_USERNAME')
        for call in calls_to_remind:
            user = User.query.get(call.user_id)
            doctor = Doctor.query.get(call.doctor_id)
            if not user or not doctor: continue
            msg_user = Message('Reminder: Your Video Call is about to start!', sender=sender_email, recipients=[user.email])
            msg_user.body = f"Hello {user.full_name},\n\nThis is a reminder that your video call with Dr. {doctor.full_name} is starting in one minute. The 'Join Call' button is now active."
            mail.send(msg_user)
            msg_doc = Message('Reminder: Your Video Call is about to start!', sender=sender_email, recipients=[doctor.email])
            msg_doc.body = f"Hello Dr. {doctor.full_name},\n\nThis is a reminder that your video call with {user.full_name} is starting in one minute. The 'Join Call' button is now active."
            mail.send(msg_doc)
            call.reminder_sent = True
        db.session.commit()

def send_medication_reminders(app):
    with app.app_context():
        now = datetime.now()
        reminders_to_send = Reminder.query.filter(
            Reminder.is_sent == False,
            Reminder.reminder_datetime <= now
        ).all()
        if not reminders_to_send: return
        sender_email = os.getenv('MAIL_USERNAME')
        for reminder in reminders_to_send:
            user = User.query.get(reminder.user_id)
            if reminder.medication_id:
                med = Medication.query.get(reminder.medication_id)
                msg_body = (f"Hello {user.full_name},\n\nThis is your reminder to take your medication:\n\n- Medication: {med.name}\n- Dosage: {med.dosage or 'As prescribed'}\n\n")
                if reminder.custom_message:
                    msg_body += f"Your personal note: '{reminder.custom_message}'\n"
            else:
                msg_body = (f"Hello {user.full_name},\n\nThis is your custom reminder from CareSync:\n\n'{reminder.custom_message}'\n")
            msg = Message("Medication Reminder from CareSync", sender=sender_email, recipients=[user.email])
            msg.body = msg_body
            mail.send(msg)
            reminder.is_sent = True
            try:
                mail.send(msg)
                print(f"--- DEBUG: Sent reminder email to {user.email} ---")
                reminder.is_sent = True
            except Exception as e:
                print(f"--- DEBUG: FAILED to send reminder email to {user.email}. Error: {e} ---")
                
        db.session.commit()