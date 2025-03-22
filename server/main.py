from flask import (
    Flask,
    request,
    jsonify,
)
from flask_sqlalchemy import SQLAlchemy
from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    logout_user,
    current_user,
)
from dotenv import load_dotenv
from flask_cors import CORS
from flask_caching import Cache
import requests
import os
import random

# Load environment variables
load_dotenv()

# Flask app setup
app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["CACHE_TYPE"] = "redis"
app.config["CACHE_REDIS_URL"] = "redis://localhost:6379/0"

cache = Cache(app)
db = SQLAlchemy(app)

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


# Database Models
class User(db.Model, UserMixin):
    """User model for authentication."""

    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)


class Review(db.Model):
    """Movie review model to store user ratings and comments."""

    __tablename__ = "reviews"
    id = db.Column(db.Integer, primary_key=True)
    movie_id = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    rating = db.Column(db.Integer, nullable=True)
    comment = db.Column(db.Text, nullable=True)

    user = db.relationship("User", backref="reviews")


# Helper function to get Wikipedia link
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


@app.after_request
def add_cors_headers(response):
    """Ensure CORS headers are applied to every response."""
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = (
        "GET, POST, PUT, DELETE, OPTIONS"
    )
    response.headers["Access-Control-Allow-Headers"] = (
        "Content-Type, Authorization"
    )
    return response


@app.route("/api/auth-status", methods=["GET"])
def auth_status():
    """Check if the user is logged in."""
    print(current_user.is_authenticated)
    return jsonify({"isAuthenticated": current_user.is_authenticated})


@cache.cached(timeout=300, key_prefix="random_movie")
@app.route("/api/movie", methods=["GET"])
def get_random_movie():
    movie_ids = [550, 13, 680, 157336]
    random_movie_id = random.choice(movie_ids)

    response = requests.get(f"{BASE_URL}{random_movie_id}?api_key={API_KEY}")
    movie = response.json()

    wiki_link = get_wikipedia_link(movie["title"])
    reviews = Review.query.filter_by(movie_id=random_movie_id).all()

    return jsonify(
        {
            "id": movie["id"],
            "title": movie["title"],
            "tagline": movie.get("tagline", ""),
            "genres": [genre["name"] for genre in movie.get("genres", [])],
            "poster_path": movie["poster_path"],
            "wiki_link": wiki_link,
            "reviews": [
                {
                    "username": rev.user.username,
                    "rating": rev.rating,
                    "comment": rev.comment,
                }
                for rev in reviews
            ],
        }
    )


@app.route("/api/review", methods=["POST"])
def submit_review():
    """Handles review submission."""
    try:
        data = request.get_json()
        movie_id = data.get("movie_id")
        rating = data.get("rating")
        comment = data.get("comment")
        username = data.get("username")
        print(data)

        if not movie_id:
            return jsonify({"error": "Movie ID is required"}), 400
        print("Querying user")
        user = User.query.filter_by(username=username).first()
        print(user.id)
        if not user:
            return jsonify({"error": "Invalid username"}), 401

        review = Review(
            movie_id=movie_id,
            user_id=user.id,
            rating=rating,
            comment=comment,
        )
        db.session.add(review)
        db.session.commit()
        cache.delete("random_movie")
        return jsonify(
            {
                "message": "Review added!",
                # "username": current_user.username,
                "rating": rating,
                "comment": comment,
            }
        )
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/search", methods=["GET"])
def search_movies():
    query = request.args.get("query")
    if not query:
        return jsonify({"error": "Query parameter is required."}), 400

    search_url = f"https://api.themoviedb.org/3/search/movie?api_key={API_KEY}&query={query}"
    response = requests.get(search_url)
    data = response.json()
    results = data.get("results", [])
    return jsonify(results)


@app.route("/api/login", methods=["POST"])
def login():
    """User login authentication."""
    data = request.get_json()
    username = data.get("username")

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "Invalid username"}), 401

    login_user(user, force=True)
    return jsonify({"message": "Login successful", "user": user.username})


@app.route("/api/register", methods=["POST"])
def register():
    """User registration."""
    data = request.get_json()
    username = data.get("username")

    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({"error": "Username already exists!"}), 400

    new_user = User(username=username)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Account created! You can now log in."})


@app.route("/api/logout", methods=["POST"])
def logout():
    """Logs out the user."""
    logout_user()
    return jsonify({"message": "Logged out successfully"})


# REIVEWS
@app.route("/api/my-reviews", methods=["GET"])
def get_user_reviews():
    """Fetch all reviews for a given username."""
    username = request.args.get("username")

    if not username:
        return jsonify({"error": "Username is required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    user_reviews = Review.query.filter_by(user_id=user.id).all()

    reviews_with_titles = []
    for review in user_reviews:
        response = requests.get(
            f"{BASE_URL}{review.movie_id}?api_key={API_KEY}"
        )
        movie = response.json()
        reviews_with_titles.append(
            {
                "id": review.id,
                "movie_id": review.movie_id,
                "movie_title": movie.get("title", "Unknown"),
                "rating": review.rating,
                "comment": review.comment,
            }
        )

    return jsonify(reviews_with_titles)


@app.route("/api/delete-review/<int:review_id>", methods=["DELETE"])
def delete_review(review_id):
    """Delete a review."""
    if request.method == "OPTIONS":
        return (
            jsonify({"message": "Preflight OK"}),
            200,
        )  # ✅ Handle OPTIONS preflight
    try:
        review = Review.query.filter_by(id=review_id).first()
        if not review:
            return jsonify({"error": "Review not found or unauthorized"}), 404

        db.session.delete(review)
        db.session.commit()
        return jsonify({"message": "Review deleted"})
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/update-reviews", methods=["POST"])
def update_reviews():
    """Update multiple reviews' ratings."""
    data = request.get_json()
    print(data)
    updates = data.get("updates", [])

    for update in updates:
        review = Review.query.filter_by(id=update["id"]).first()
        if review:
            if "rating" in update:
                review.rating = update["rating"]
            if "comment" in update:
                review.comment = update["comment"]

    db.session.commit()
    return jsonify({"message": "Reviews updated successfully"})


if __name__ == "__main__":
    port = int(os.getenv("PORT", 7890))
    app.run(debug=False, host="0.0.0.0", port=port)
