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
from jose import jwt
from typing import Optional
from jose.utils import base64url_decode
import time
import json
import uuid
import hashlib
import base64
import redis as redislib
import requests
import os
import random

# Load environment variables
load_dotenv()

# Flask app setup
app = Flask(__name__)

# CORS setup: allow local dev and configurable production origin
FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN", "https://movie-app.aditya-prakash.me"
)
ALLOWED_ORIGINS = {
    FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
}

CORS(
    app,
    supports_credentials=True,
    origins=list(ALLOWED_ORIGINS),
)

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
cache_type = os.getenv("CACHE_TYPE", "SimpleCache")
app.config["CACHE_TYPE"] = cache_type
if cache_type.lower() == "redis":
    app.config["CACHE_REDIS_URL"] = os.getenv(
        "CACHE_REDIS_URL", "redis://redis:6379/0"
    )

cache = Cache(app)
db = SQLAlchemy(app)

# Redis client for sessions (reuse CACHE_REDIS_URL)
REDIS_URL = os.getenv("CACHE_REDIS_URL", "redis://redis:6379/0")
redis_client = None
try:
    if cache_type.lower() == "redis":
        redis_client = redislib.from_url(REDIS_URL)
except Exception:
    redis_client = None

# Cognito config
COGNITO_REGION = os.getenv("COGNITO_REGION", "us-east-2")
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID")
COGNITO_CLIENT_SECRET = os.getenv("COGNITO_CLIENT_SECRET")
COGNITO_DOMAIN = os.getenv("COGNITO_DOMAIN")  # e.g., your-domain.auth.us-east-2.amazoncognito.com
COGNITO_REDIRECT_URI = os.getenv("COGNITO_REDIRECT_URI")
COGNITO_LOGOUT_REDIRECT_URI = os.getenv("COGNITO_LOGOUT_REDIRECT_URI")
COGNITO_SCOPE = os.getenv("COGNITO_SCOPE", "openid email")

SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "app_session")
SESSION_TTL_SECS = int(os.getenv("SESSION_TTL_SECS", "3600"))

ISSUER = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}" if COGNITO_USER_POOL_ID else None
JWKS_URL = f"{ISSUER}/.well-known/jwks.json" if ISSUER else None


def _get_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


# Cache JWKS per user pool to avoid mismatches after switching pools
@cache.cached(timeout=3600, key_prefix=f"jwks:{COGNITO_REGION}:{COGNITO_USER_POOL_ID}")
def _get_jwks():
    if not JWKS_URL:
        return None
    resp = requests.get(JWKS_URL, timeout=5)
    resp.raise_for_status()
    return resp.json()


def _verify_id_token(id_token: str, access_token: Optional[str] = None):
    if not (ISSUER and COGNITO_CLIENT_ID):
        raise ValueError("Cognito not configured")
    jwks = _get_jwks()
    headers = jwt.get_unverified_header(id_token)
    kid = headers.get("kid")
    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key:
        raise ValueError("Public key not found in JWKS")
    claims = jwt.decode(
        id_token,
        key,
        algorithms=["RS256"],
        audience=COGNITO_CLIENT_ID,
        issuer=ISSUER,
        access_token=access_token,
    )
    return claims


def _session_store_put(sid: str, data: dict, ttl: int):
    if redis_client is not None:
        redis_client.setex(f"sess:{sid}", ttl, json.dumps(data))
    else:
        cache.set(f"sess:{sid}", data, timeout=ttl)


def _session_store_get(sid: str):
    if redis_client is not None:
        val = redis_client.get(f"sess:{sid}")
        return json.loads(val) if val else None
    return cache.get(f"sess:{sid}")


def _session_store_del(sid: str):
    if redis_client is not None:
        redis_client.delete(f"sess:{sid}")
    else:
        cache.delete(f"sess:{sid}")

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
    try:
        search_response = requests.get(search_url, timeout=5).json()
    except Exception:
        return "#"

    if not search_response.get("query", {}).get("search"):
        return "#"

    for result in search_response["query"]["search"]:
        wiki_title = result["title"]
        return f"https://en.wikipedia.org/wiki/{wiki_title.replace(' ', '_')}"

    return "#"


@app.after_request
def add_cors_headers(response):
    """Ensure CORS headers are applied to every response."""
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
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
    """Check if the user is logged in via Cognito-backed session."""
    sid = request.cookies.get(SESSION_COOKIE_NAME)
    if not sid:
        return jsonify({"isAuthenticated": False})
    sess = _session_store_get(sid)
    if not sess:
        return jsonify({"isAuthenticated": False})
    # Verify token and surface identity details; display_name should be just the 'name' claim
    try:
        claims = _verify_id_token(sess.get("id_token"), sess.get("access_token"))
        return jsonify({
            "isAuthenticated": True,
            "username": sess.get("username"),
            "sub": sess.get("sub"),
            "email": sess.get("email"),
            # Only expose the Cognito 'name' claim for display purposes; no fallbacks
            "display_name": claims.get("name") or "",
        })
    except Exception:
        return jsonify({"isAuthenticated": False})


@app.route("/api/auth/login", methods=["GET"])
def auth_login():
    """Start the OAuth2 Code + PKCE flow with Cognito Hosted UI."""
    if not all([COGNITO_DOMAIN, COGNITO_CLIENT_ID, COGNITO_REDIRECT_URI]):
        return jsonify({"error": "Cognito not configured"}), 500
    state = uuid.uuid4().hex
    nonce = uuid.uuid4().hex
    code_verifier = base64.urlsafe_b64encode(os.urandom(40)).rstrip(b"=").decode("ascii")
    code_challenge = _get_code_challenge(code_verifier)
    # Store transient values with short TTL
    _session_store_put(f"oidc:{state}", {
        "nonce": nonce,
        "code_verifier": code_verifier,
        "ts": int(time.time()),
    }, ttl=600)
    # Request scopes must match what's allowed on the Cognito App Client
    scope = COGNITO_SCOPE
    auth_url = (
        f"https://{COGNITO_DOMAIN}/oauth2/authorize?"
        f"client_id={COGNITO_CLIENT_ID}&response_type=code&scope={requests.utils.quote(scope)}"
        f"&redirect_uri={requests.utils.quote(COGNITO_REDIRECT_URI, safe='')}&state={state}&nonce={nonce}"
        f"&code_challenge={code_challenge}&code_challenge_method=S256"
    )
    # Best-effort attempt to hint signup screen
    if request.args.get("signup"):
        auth_url += "&screen_hint=signup"
    # Standard behavior: redirect the user agent to Cognito Hosted UI
    return (
        "",
        302,
        {"Location": auth_url},
    )


@app.route("/api/auth/callback", methods=["GET"])
def auth_callback():
    """Handle the redirect from Cognito and establish a session."""
    if not all([COGNITO_DOMAIN, COGNITO_CLIENT_ID, COGNITO_REDIRECT_URI]):
        return jsonify({"error": "Cognito not configured"}), 500
    code = request.args.get("code")
    state = request.args.get("state")
    if not code or not state:
        return jsonify({"error": "Missing code/state"}), 400
    st = _session_store_get(f"oidc:{state}")
    if not st:
        return jsonify({"error": "Invalid state"}), 400
    code_verifier = st.get("code_verifier")
    # Exchange code for tokens
    token_url = f"https://{COGNITO_DOMAIN}/oauth2/token"
    data = {
        "grant_type": "authorization_code",
        "client_id": COGNITO_CLIENT_ID,
        "code": code,
        "redirect_uri": COGNITO_REDIRECT_URI,
        "code_verifier": code_verifier,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    auth = None
    if COGNITO_CLIENT_SECRET:
        # Basic auth per spec for confidential clients
        creds = f"{COGNITO_CLIENT_ID}:{COGNITO_CLIENT_SECRET}".encode("utf-8")
        headers["Authorization"] = "Basic " + base64.b64encode(creds).decode("utf-8")
    resp = requests.post(token_url, data=data, headers=headers, timeout=10)
    if resp.status_code != 200:
        return jsonify({"error": "Token exchange failed", "details": resp.text}), 400
    tok = resp.json()
    id_token = tok.get("id_token")
    access_token = tok.get("access_token")
    expires_in = int(tok.get("expires_in", SESSION_TTL_SECS))
    try:
        claims = _verify_id_token(id_token, access_token)
    except Exception as e:
        return jsonify({"error": "Invalid ID token", "details": str(e)}), 400

    # Ensure user exists in local DB (idempotent upsert by username)
    username = (
        claims.get("cognito:username")
        or claims.get("preferred_username")
        or claims.get("email")
        or claims.get("sub")
    )
    # Display name should be just the 'name' claim (no fallbacks)
    display_name = claims.get("name")
    user_rec = User.query.filter_by(username=username).first()
    if not user_rec:
        user_rec = User(username=username)
        db.session.add(user_rec)
        db.session.commit()

    # Establish server-side session
    sid = uuid.uuid4().hex
    sess = {
        "id_token": id_token,
        "access_token": access_token,
        "sub": claims.get("sub"),
        "username": username,
        "email": claims.get("email"),
        "display_name": display_name,
        "iat": claims.get("iat"),
        "exp": claims.get("exp"),
        "user_id": user_rec.id,
    }
    ttl = min(expires_in, SESSION_TTL_SECS)
    # Prefer token exp if sooner
    now = int(time.time())
    if claims.get("exp"):
        ttl = min(ttl, max(60, claims["exp"] - now))
    _session_store_put(sid, sess, ttl)

    # Set secure HttpOnly cookie and redirect to app
    redirect_to = os.getenv("FRONTEND_ORIGIN", "") + "/explore"
    response = ("", 302, {"Location": redirect_to})
    from flask import make_response
    resp = make_response("", 302)
    resp.headers["Location"] = redirect_to
    resp.set_cookie(
        SESSION_COOKIE_NAME,
        sid,
        max_age=ttl,
        secure=True,
        httponly=True,
        samesite="None",
        path="/",
    )
    return resp


@app.route("/api/auth/logout", methods=["POST", "GET"])
def auth_logout():
    sid = request.cookies.get(SESSION_COOKIE_NAME)
    if sid:
        _session_store_del(sid)
    # Clear cookie
    resp = jsonify({"message": "Logged out"})
    resp.set_cookie(SESSION_COOKIE_NAME, "", max_age=0, path="/", secure=True, httponly=True, samesite="None")
    # If GET, redirect the user to Cognito sign-out endpoint
    if request.method == "GET" and COGNITO_DOMAIN and COGNITO_CLIENT_ID and COGNITO_LOGOUT_REDIRECT_URI:
        logout_url = (
            f"https://{COGNITO_DOMAIN}/logout?client_id={COGNITO_CLIENT_ID}"
            f"&logout_uri={requests.utils.quote(COGNITO_LOGOUT_REDIRECT_URI, safe='')}"
        )
        return ("", 302, {"Location": logout_url})
    return resp


@cache.cached(timeout=300, key_prefix="random_movie")
@app.route("/api/movie", methods=["GET"])
@app.route("/api/explore", methods=["GET"])  # New path for random explore
def get_random_movie():
    movie_ids = [550, 13, 680, 157336, 120, 424, 155, 122, 27205, 423]
    random_movie_id = random.choice(movie_ids)

    try:
        response = requests.get(
            f"{BASE_URL}{random_movie_id}?api_key={API_KEY}", timeout=8
        )
        response.raise_for_status()
        movie = response.json()
    except Exception as e:
        return jsonify({"error": "Failed to fetch movie", "details": str(e)}), 502

    wiki_link = get_wikipedia_link(movie["title"])
    reviews = Review.query.filter_by(movie_id=random_movie_id).all()

    return jsonify(
        {
            "id": movie["id"],
            "title": movie["title"],
            "tagline": movie.get("tagline", ""),
            "genres": [
                {"id": g.get("id"), "name": g.get("name")}
                for g in movie.get("genres", [])
            ],
            "poster_path": movie["poster_path"],
            "overview": movie.get("overview", ""),
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

        # Identify user from session
        sid = request.cookies.get(SESSION_COOKIE_NAME)
        sess = _session_store_get(sid) if sid else None

        if not movie_id:
            return jsonify({"error": "Movie ID is required"}), 400
        if not sess:
            return jsonify({"error": "Unauthorized"}), 401
        user = None
        if sess.get("user_id"):
            user = User.query.filter_by(id=sess["user_id"]).first()
        if not user and sess.get("username"):
            user = User.query.filter_by(username=sess["username"]).first()
        if not user:
            return jsonify({"error": "User not found"}), 401

        review = Review(
            movie_id=movie_id,
            user_id=user.id,
            rating=rating,
            comment=comment,
        )
        db.session.add(review)
        db.session.commit()
        # Invalidate caches affected by this change
        cache.delete("random_movie")
        try:
            cache.delete(f"movie_{movie_id}")
        except Exception:
            pass
        return jsonify(
            {
                "message": "Review added!",
                "rating": rating,
                "comment": comment,
            }
        )
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@cache.cached(timeout=300, query_string=True)
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


def _movie_cache_key():
    # Cache per-movie response, including reviews embedded
    return f"movie_{request.view_args['movie_id']}"

@cache.cached(timeout=300, key_prefix=_movie_cache_key)
@app.route("/api/movie/<int:movie_id>", methods=["GET"])
def get_movie(movie_id):
    try:
        tmdb_resp = requests.get(
            f"{BASE_URL}{movie_id}?api_key={API_KEY}", timeout=8
        )
        if tmdb_resp.status_code == 404:
            return jsonify({"error": "Movie not found"}), 404
        tmdb_resp.raise_for_status()
        movie = tmdb_resp.json()
    except Exception as e:
        return jsonify({"error": "Failed to fetch movie", "details": str(e)}), 502

    wiki_link = get_wikipedia_link(movie.get("title", ""))
    reviews = Review.query.filter_by(movie_id=movie_id).all()

    return jsonify(
        {
            "id": movie.get("id", movie_id),
            "title": movie.get("title", "Untitled"),
            "tagline": movie.get("tagline", ""),
            "genres": [
                {"id": g.get("id"), "name": g.get("name")}
                for g in movie.get("genres", [])
            ],
            "poster_path": movie.get("poster_path"),
            "overview": movie.get("overview", ""),
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
    user = None
    if username:
        user = User.query.filter_by(username=username).first()
    else:
        # Fallback to session
        sid = request.cookies.get(SESSION_COOKIE_NAME)
        sess = _session_store_get(sid) if sid else None
        if sess and sess.get("user_id"):
            user = User.query.filter_by(id=sess["user_id"]).first()
        elif sess and sess.get("username"):
            user = User.query.filter_by(username=sess["username"]).first()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

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
        movie_id = review.movie_id
        db.session.delete(review)
        db.session.commit()
        # Invalidate caches for this movie and random selection
        try:
            cache.delete("random_movie")
            cache.delete(f"movie_{movie_id}")
        except Exception:
            pass
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

    affected_movie_ids = set()
    for update in updates:
        review = Review.query.filter_by(id=update["id"]).first()
        if review:
            affected_movie_ids.add(review.movie_id)
            if "rating" in update:
                review.rating = update["rating"]
            if "comment" in update:
                review.comment = update["comment"]

    db.session.commit()
    # Invalidate caches for all affected movies and random selection
    try:
        cache.delete("random_movie")
        for mid in affected_movie_ids:
            cache.delete(f"movie_{mid}")
    except Exception:
        pass
    return jsonify({"message": "Reviews updated successfully"})


if __name__ == "__main__":
    # Ensure database tables exist on startup when running via python main.py
    try:
        with app.app_context():
            db.create_all()
    except Exception as e:
        # Log and continue; app may still start and expose errors in logs
        print(f"DB init error: {e}")
    port = int(os.environ.get("PORT", 8080))
    app.run(debug=False, host="0.0.0.0", port=port)
