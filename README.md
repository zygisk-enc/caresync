# 🩺 CareSync — Intelligent Telehealth Platform

CareSync is a complete AI-powered telehealth system built using **Flask**, designed to connect doctors and patients through secure chat, video calls, prescriptions, and automated reminders — all in one professional and responsive interface.

---

## 🌟 Overview

CareSync unifies healthcare communication into one system. It includes doctor and patient dashboards, appointment management, real-time messaging, and Gemini AI integration for smart health insights.

---

## 🧩 Tech Stack

### Backend
- **Python 3.x**, **Flask**
- **Flask-SQLAlchemy**, **Flask-Migrate**
- **Flask-Mail**, **Flask-SocketIO**, **Flask-WTF**
- **APScheduler**, **Werkzeug Security**, **python-dotenv**

### Frontend
- HTML5, CSS3, JavaScript (Socket.IO Client)
- Jinja2 Templating
- Fully responsive and mobile-optimized UI

### AI Integration
- **Google Generative AI (Gemini)**  
- **Pillow** and **pdf2image** for PDF/Image analysis

### Database
- SQLite (Default) — Easily replaceable with PostgreSQL/MySQL

---

## ⚙️ Core Features

### 👨‍⚕️ Doctors
- Approve and manage patient appointments & calls  
- Issue digital e-prescriptions  
- Toggle real-time availability  
- Review chat and call history

### 🧍‍♂️ Patients
- Search and book verified doctors  
- Access health records, prescriptions, and reminders  
- Start secure chat or video calls  
- Receive AI-driven insights via Gemini

### 💬 Communication & Automation
- **Socket.IO** for real-time updates  
- **Flask-Mail + APScheduler** for automated reminders  
- **AI prompt response** system for intelligent interactions

### 🩸 Blood Bank Integration
- Built-in dataset of Indian blood banks  
- Location-based filtering using the Haversine algorithm

---

## 🗂️ Project Structure

```
CareSync/
│
├── app.py                     # Main application entry
├── extensions.py              
├── models.py                  
│
├── auth_routes.py
├── admin_routes.py
├── main_routes.py
├── doctor_routes.py
├── messaging_routes.py
├── dashboard_routes.py
├── prescription_routes.py
├── video_call_routes.py
├── blood_bank_routes.py
├── history_routes.py
│
├── scheduler.py                # Email reminder scheduler
├── import_blood_banks.py
│
├── templates/                  # HTML templates (Jinja2)
├── static/                     # CSS / JS / uploads / datasets
│
├── requirements.txt
└── README.md
```

---

## 🚀 Installation Guide

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/caresync.git
cd caresync
```

### 2. Set Up Virtual Environment
```bash
python -m venv venv
source venv/bin/activate      # Linux/macOS
venv\Scripts\activate       # Windows
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Create Environment File
Make a `.env` file in the root directory:
```
SECRET_KEY=your_secret_key
SQLALCHEMY_DATABASE_URI=sqlite:///caresync.db
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_password
GOOGLE_API_KEY=your_gemini_api_key
```

### 5. Initialize the Database
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### 6. Run the App
```bash
python app.py
```

Visit: [http://localhost:5000](http://localhost:5000)

---

## ⏰ Automated Tasks
CareSync uses **APScheduler** for:
- Video call reminders
- Medication notifications

You can trigger manually if required:
```bash
python -c "from scheduler import send_call_reminders; from app import app; send_call_reminders(app)"
```

---

## 🔒 Security Guidelines
- Keep `.env` private — never commit secrets  
- Use HTTPS and secure cookies  
- Enable CSRF protection for all forms  
- Use strong mail passwords or App Passwords

---

## 🧠 Architecture Diagram

```
Frontend (HTML, CSS, JS)
        ↓
Flask Blueprints (Auth, Chat, Video, AI)
        ↓
Database Layer (SQLAlchemy ORM)
        ↓
Scheduler & Flask-Mail → Notifications
        ↓
Gemini AI API → Smart Prompt Responses
```

---

## 🧭 Roadmap
- Dockerized deployment  
- Two-Factor Authentication  
- Admin analytics dashboard  
- Multi-language interface  
- Dedicated mobile app version  

---

## 🧑‍💻 Contributing
1. Fork the repository  
2. Create your feature branch (`git checkout -b feature/new-feature`)  
3. Commit changes (`git commit -m "Add new feature"`)  
4. Push to your fork (`git push origin feature/new-feature`)  
5. Open a Pull Request  

---

## 🪪 License
Licensed under the **MIT License**.

--

Give this project a ⭐ if you find it helpful!
