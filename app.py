from flask import Flask, render_template, redirect, url_for, request, session, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from authlib.integrations.flask_client import OAuth
import os
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///user.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login_page'

oauth = OAuth(app)

# Google OAuth Configuration
google = oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

# User model
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=True)  # For local signup
    google_id = db.Column(db.String(100), unique=True, nullable=True)  # For Google OAuth

# Timetable model
class Timetable(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    data = db.Column(db.Text, nullable=False)  # Store JSON data as a string

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Home page (protected)
@app.route('/home')
@login_required
def home_page():
    return render_template('home.html')

# About page
@app.route('/about')
def about_page():
    return render_template('about.html')

# Timetable page (protected)
@app.route('/timetable')
@login_required
def timetable_page():
    return render_template('timetable.html')

# Login page
@app.route('/login', methods=['GET', 'POST'])
def login_page():
    if request.method == 'POST':
        username = request.form['email']  # Using email as username
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user)
            flash("Login successful!", "success")
            return redirect(url_for('home_page'))
        else:
            flash("Invalid username or password", "danger")
    return render_template('login.html')

# Signup page
@app.route('/signup', methods=['GET', 'POST'])
def signup_page():
    if request.method == 'POST':
        username = request.form['email']
        password = request.form['password']
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        
        if User.query.filter_by(username=username).first():
            flash("Username already exists. Try another one.", "danger")
            return redirect(url_for('signup_page'))

        new_user = User(username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        flash("Signup successful! Please log in.", "success")
        return redirect(url_for('login_page'))
    
    return render_template('signup.html')

# Google Login Route
@app.route('/google-login')
def google_login_redirect():
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

# Google OAuth Callback
@app.route('/login/google/callback')
def google_callback():
    token = google.authorize_access_token()
    if token is None:
        flash("Google login failed.", "danger")
        return redirect(url_for('login_page'))

    user_info = google.get('https://www.googleapis.com/oauth2/v1/userinfo').json()
    
    if 'id' not in user_info or 'email' not in user_info:
        flash("Google login failed: Missing user information.", "danger")
        return redirect(url_for('login_page'))

    google_id = user_info['id']
    email = user_info['email']

    user = User.query.filter_by(google_id=google_id).first()
    if not user:
        existing_user = User.query.filter_by(username=email).first()
        if existing_user:
            existing_user.google_id = google_id
            db.session.commit()
            user = existing_user
        else:
            user = User(username=email, google_id=google_id)
            db.session.add(user)
            db.session.commit()

    login_user(user)
    flash("Google login successful!", "success")
    return redirect(url_for('home_page'))

# Signout Route
@app.route('/signout')
@login_required
def signout():
    logout_user()
    flash("You have been signed out.", "info")
    return redirect(url_for('login_page'))

# Save Timetable (Backend API)
@app.route('/save_timetable', methods=['POST'])
@login_required
def save_timetable():
    data = request.json.get("timetable")

    if not data:
        return jsonify({"message": "No timetable data provided"}), 400

    new_timetable = Timetable(user_id=current_user.id, data=str(data))
    db.session.add(new_timetable)
    db.session.commit()

    return jsonify({"message": "Timetable saved successfully!"})

# Load Timetable (Backend API)
@app.route('/load_timetable', methods=['GET'])
@login_required
def load_timetable():
    timetables = Timetable.query.filter_by(user_id=current_user.id).all()
    timetable_list = [eval(timetable.data) for timetable in timetables]

    return jsonify({"timetables": timetable_list})

# Root redirect
@app.route('/')
def index():
    return redirect(url_for('home_page'))

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
