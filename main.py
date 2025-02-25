from flask import (
    Flask,
    render_template,
    redirect,
    request,
    flash,
    url_for,
    jsonify,
)
from flask_sqlalchemy import SQLAlchemy
from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    logout_user,
    current_user,
    login_required,
)
import requests
import os
from dotenv import load_dotenv
import random
from models import db, User, Review

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
print("============================================")
print(os.getenv("DATABASE_URL"))
print("============================================")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

db.init_app(app)

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# TMDB API settings
API_KEY = os.getenv("API_KEY")
BASE_URL = "https://api.themoviedb.org/3/movie/"


def get_wikipedia_link(title):
    """Fetch Wikipedia link, handling disambiguation pages."""
    search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={title}&format=json"
    search_response = requests.get(search_url).json()

    if not search_response.get("query", {}).get("search"):
        return "#"

    for result in search_response["query"]["search"]:
        wiki_title = result["title"]
        return f"https://en.wikipedia.org/wiki/{wiki_title.replace(' ', '_')}"

    return "#"


@app.route("/", methods=["GET", "POST"])
@login_required
def home():
    """
    Display random movie details with Wikipedia link.
    """
    movie_ids = [550, 13, 680, 157336]
    movie_id = random.choice(movie_ids)
    response = requests.get(f"{BASE_URL}{movie_id}?api_key={API_KEY}")
    movie = response.json()

    wiki_link = get_wikipedia_link(movie["title"])
    reviews = Review.query.filter_by(movie_id=movie_id).all()

    if request.method == "POST":
        submitted_movie_id = int(request.form.get("movie_id"))
        rating = request.form.get("rating")
        comment = request.form.get("comment")

        if rating or comment:
            review = Review(
                movie_id=submitted_movie_id,
                user_id=current_user.id,
                rating=rating,
                comment=comment,
            )
            db.session.add(review)
            db.session.commit()

            return jsonify(
                {
                    "username": current_user.username,
                    "rating": rating,
                    "comment": comment,
                }
            )

    return render_template(
        "home.html",
        title=movie["title"],
        tagline=movie["tagline"],
        genres=[genre["name"] for genre in movie["genres"]],
        poster_path=movie["poster_path"],
        movie_id=movie_id,
        wiki_link=wiki_link,
        reviews=reviews,
    )


@app.route("/login", methods=["GET", "POST"])
def login():
    """User login page"""
    error_message = None

    if request.method == "POST":
        username = request.form.get("username")
        print("============================================")
        print(username)
        print("============================================")
        print("going to query")
        user = User.query.filter_by(username=username).first()
        print("============================================")
        print(user)
        print("============================================")
        if user:
            login_user(user)
            return redirect(url_for("home"))
        else:
            error_message = "Invalid username. Please try again."

    return render_template("login.html", error=error_message)


@app.route("/register", methods=["GET", "POST"])
def register():
    """User registration page."""
    if request.method == "POST":
        username = request.form.get("username")
        print(f"Received username: {username}")

        try:
            # print("Checking if database connection is working...")
            # db.session.execute(text("SELECT 1"))
            # print("✅ Database connection successful!")

            existing_user = User.query.filter_by(username=username).first()
            print("✅ Query successful!")

            if existing_user:
                flash("Username already exists!", "danger")
            else:
                print("Creating new user...")
                new_user = User(username=username)
                db.session.add(new_user)
                db.session.commit()
                print("✅ User created!")
                flash("Account created! You can now log in.", "success")
                return redirect(url_for("login"))

        except Exception as e:
            print(f"Database Error: {e}")
            return f"Database error: {e}", 500

    return render_template("register.html")


@app.route("/logout")
@login_required
def logout():
    """Logout the user."""
    logout_user()
    flash("Logged out successfully!", "info")
    return redirect(url_for("login"))


@app.route("/favorites")
@login_required
def favorites():
    """Display the user's favorite movies."""
    return render_template("favorites.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    app.run(debug=True, host="0.0.0.0", port=port)
