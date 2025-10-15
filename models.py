from extensions import db
from sqlalchemy import Date, DateTime, func, Text, ForeignKey, Time, Boolean
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    age = db.Column(db.Integer)
    gender = db.Column(db.String(20))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    
    appointments = db.relationship('Appointment', backref='user', lazy=True, cascade="all, delete-orphan")
    notifications = db.relationship('Notification', foreign_keys='Notification.recipient_user_id', backref='user', lazy=True, cascade="all, delete-orphan")
    prescriptions = db.relationship('Prescription', backref='user', lazy=True, cascade="all, delete-orphan")
    reminders = db.relationship('Reminder', backref='user', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Doctor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    password_hash = db.Column(db.String(256))
    # ... (all other doctor fields are correct)
    license_number = db.Column(db.String(100), nullable=False)
    medical_council = db.Column(db.String(200))
    specialization = db.Column(db.String(100), nullable=False)
    qualifications = db.Column(db.Text, nullable=False)
    clinic_name = db.Column(db.String(200), nullable=False)
    experience_years = db.Column(db.Integer, nullable=False)
    clinic_address = db.Column(db.Text, nullable=False)
    license_filename = db.Column(db.String(256))
    id_filename = db.Column(db.String(256))
    photo_filename = db.Column(db.String(256))
    dob = db.Column(Date, nullable=True)
    clinic_latitude = db.Column(db.Float, nullable=True)
    clinic_longitude = db.Column(db.Float, nullable=True)
    is_approved = db.Column(db.Boolean, default=False)
    is_available = db.Column(db.Boolean, default=True, nullable=True)
    
    appointments = db.relationship('Appointment', backref='doctor', lazy=True, cascade="all, delete-orphan")
    notifications = db.relationship('Notification', foreign_keys='Notification.recipient_doctor_id', backref='doctor', lazy=True, cascade="all, delete-orphan")
    prescriptions = db.relationship('Prescription', backref='doctor', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=False)
    appointment_datetime = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='Pending') 
    created_at = db.Column(db.DateTime, server_default=func.now())

class VideoCall(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=False)
    scheduled_time = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='Pending') 
    created_at = db.Column(db.DateTime, server_default=func.now())
    reminder_sent = db.Column(db.Boolean, default=False)
    user = db.relationship('User', foreign_keys=[user_id])
    doctor = db.relationship('Doctor', foreign_keys=[doctor_id])

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    timestamp = db.Column(DateTime, server_default=func.now())
    recipient_user_id = db.Column(db.Integer, ForeignKey('user.id'), nullable=True)
    recipient_doctor_id = db.Column(db.Integer, ForeignKey('doctor.id'), nullable=True)

class Conversation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=False)
    messages = db.relationship('Message', backref='conversation', lazy=True, cascade="all, delete-orphan")
    timestamp = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversation.id'), nullable=False)
    sender_type = db.Column(db.String(10), nullable=False)
    text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, server_default=func.now())
    def to_dict(self):
        return {'id': self.id, 'conversation_id': self.conversation_id, 'sender_type': self.sender_type, 'text': self.text, 'timestamp': self.timestamp.isoformat()}

class BloodBank(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    # ... (all other blood bank fields)
    state = db.Column(db.String(100), nullable=True)
    district = db.Column(db.String(100), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    address = db.Column(db.Text, nullable=True)
    pincode = db.Column(db.String(10), nullable=True)
    contact_no = db.Column(db.String(100), nullable=True)
    mobile = db.Column(db.String(100), nullable=True)
    helpline = db.Column(db.String(100), nullable=True)
    fax = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    website = db.Column(db.String(255), nullable=True)
    nodal_officer = db.Column(db.String(150), nullable=True)
    nodal_officer_contact = db.Column(db.String(100), nullable=True)
    nodal_officer_mobile = db.Column(db.String(100), nullable=True)
    nodal_officer_email = db.Column(db.String(120), nullable=True)
    nodal_officer_qualification = db.Column(db.String(150), nullable=True)
    category = db.Column(db.String(100), nullable=True)
    blood_components_available = db.Column(db.String(10), nullable=True)
    apheresis_available = db.Column(db.String(10), nullable=True)
    service_time = db.Column(db.String(50), nullable=True)
    license_no = db.Column(db.String(100), nullable=True)
    license_obtain_date = db.Column(db.String(50), nullable=True)
    renewal_date = db.Column(db.String(50), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

class Prescription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=False)
    video_call_id = db.Column(db.Integer, db.ForeignKey('video_call.id'), nullable=True)
    date_prescribed = db.Column(db.DateTime, server_default=func.now())
    notes = db.Column(db.Text, nullable=True)
    medications = db.relationship('Medication', backref='prescription', lazy=True, cascade="all, delete-orphan")

class Medication(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    prescription_id = db.Column(db.Integer, db.ForeignKey('prescription.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    dosage = db.Column(db.String(100), nullable=True)
    frequency = db.Column(db.String(100), nullable=True)
    duration = db.Column(db.String(100), nullable=True)

class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    medication_id = db.Column(db.Integer, db.ForeignKey('medication.id'), nullable=True)
    reminder_datetime = db.Column(db.DateTime, nullable=False)
    custom_message = db.Column(db.Text, nullable=True)
    is_sent = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, server_default=func.now())

class PromptHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # Can be for a user
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctor.id'), nullable=True) # Or for a doctor
    
    prompt_text = db.Column(db.Text, nullable=False)
    response_text = db.Column(db.Text, nullable=False)
    
    # Store the path to the uploaded image if any
    image_url = db.Column(db.String(255), nullable=True) 
    
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp())

    user = db.relationship('User', backref='prompt_history', foreign_keys=[user_id])
    doctor = db.relationship('Doctor', backref='doctor_prompt_history', foreign_keys=[doctor_id])

    def __repr__(self):
        return f"<PromptHistory {self.id} User:{self.user_id} Doctor:{self.doctor_id}>"