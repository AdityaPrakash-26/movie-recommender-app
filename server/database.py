from flask import Flask
from models import db

app = Flask(__name__)

# Configure the database URI
app.config["SQLALCHEMY_DATABASE_URI"] = (
    "postgresql://movie_db_hcp3_user:OZ3G5h2sda20cnaafIX9GI3D7ONGIdIQ@dpg-cvfh07t2ng1s73d6lg20-a.ohio-postgres.render.com/movie_db_hcp3"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize the database
db.init_app(app)

# Create tables in the database
with app.app_context():
    db.create_all()
    print("Tables created successfully!")
