from flask import Blueprint, session, redirect, url_for, request, jsonify
from models import db, Reminder, Medication, Prescription, User
from datetime import datetime

reminder = Blueprint('reminder', __name__)

@reminder.route('/reminders/create', methods=['POST'])
def create_reminders():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    medication_id = data.get('medication_id') # Can be null
    dates = data.get('dates') # List of 'YYYY-MM-DD'
    times = data.get('times') # List of 'HH:MM'
    custom_message = data.get('custom_message')

    if not dates or not times:
        return jsonify({'error': 'Dates and times are required.'}), 400
    
    try:
        for date_str in dates:
            for time_str in times:
                reminder_dt = datetime.strptime(f"{date_str} {time_str}", '%Y-%m-%d %H:%M')
                new_reminder = Reminder(
                    user_id=session['user_id'],
                    medication_id=medication_id,
                    reminder_datetime=reminder_dt,
                    custom_message=custom_message
                )
                db.session.add(new_reminder)
        
        db.session.commit()
        return jsonify({'message': 'Reminders set successfully!'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# --- START: NEW ROUTES ---
@reminder.route('/api/reminders')
def get_reminders():
    """Fetches all upcoming reminders for the logged-in user."""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    reminders = Reminder.query.filter(
        Reminder.user_id == session['user_id'],
        Reminder.is_sent == False
    ).order_by(Reminder.reminder_datetime.asc()).all()

    results = []
    for rem in reminders:
        med_name = None
        if rem.medication_id:
            med = Medication.query.get(rem.medication_id)
            med_name = med.name if med else "Unknown Medication"
        
        results.append({
            'id': rem.id,
            'medication_name': med_name,
            'custom_message': rem.custom_message,
            'datetime': rem.reminder_datetime.strftime('%B %d, %Y at %I:%M %p')
        })
    
    return jsonify(results)

@reminder.route('/api/reminder/delete/<int:reminder_id>', methods=['DELETE'])
def delete_reminder(reminder_id):
    """Deletes a specific reminder."""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    reminder_to_delete = Reminder.query.get_or_404(reminder_id)

    # Security check: ensure the user owns this reminder
    if reminder_to_delete.user_id != session['user_id']:
        return jsonify({'error': 'Forbidden'}), 403

    try:
        db.session.delete(reminder_to_delete)
        db.session.commit()
        return jsonify({'message': 'Reminder deleted successfully.'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
# --- END: NEW ROUTES ---