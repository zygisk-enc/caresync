from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail

# Create uninitialized extension objects
db = SQLAlchemy()
mail = Mail()