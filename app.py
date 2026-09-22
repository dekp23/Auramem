import os
import secrets
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv
from flask import (
    Flask,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET")

SB_URL = os.environ.get("SUPABASE_URL")
SB_KEY = os.environ.get("SUPABASE_KEY")
GROQ_KEY = os.environ.get("GROQ_API_KEY")
REQUEST_TIMEOUT = 10
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"


@app.before_request
def require_secret_key():
    if not app.secret_key and not app.testing:
        raise RuntimeError("FLASK_SECRET must be configured before serving requests")


@app.context_processor
def inject_csrf_token():
    return {"csrf_token": get_csrf_token()}


def get_csrf_token():
    token = session.get("_csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["_csrf_token"] = token
    return token


def validate_csrf():
    submitted = request.form.get("_csrf_token") or request.headers.get("X-CSRF-Token")
    return bool(submitted) and secrets.compare_digest(submitted, get_csrf_token())


def get_auth_token():
    return request.cookies.get("aura_access_token")


def set_auth_cookie(response, token):
    response.set_cookie(
        "aura_access_token",
        token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="Lax",
        max_age=3600,
    )
    return response


def sb_api(endpoint, method="GET", data=None, auth_token=None):
    if not SB_URL or not SB_KEY:
        raise RuntimeError("Supabase configuration is incomplete")
    headers = {
        "apikey": SB_KEY,
        "Authorization": f"Bearer {auth_token or SB_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    response = requests.request(
        method,
        f"{SB_URL}/{endpoint}",
        headers=headers,
        json=data,
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def get_profile(uid, token):
    data = sb_api(f"rest/v1/profiles?id=eq.{uid}", auth_token=token)
    if isinstance(data, list) and data:
        return data[0]
    new_profile = {
        "id": uid,
        "patient_name": "Friend",
        "location_status": "at home",
        "ai_personal_context": "A kind soul.",
    }
    sb_api("rest/v1/profiles", "POST", new_profile, auth_token=token)
    return new_profile


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        if not validate_csrf():
            return (
                render_template(
                    "signup.html", error="Your form expired. Please try again."
                ),
                400,
            )
        try:
            response = requests.post(
                f"{SB_URL}/auth/v1/signup",
                headers={"apikey": SB_KEY},
                json={
                    "email": request.form.get("email"),
                    "password": request.form.get("password"),
                },
                timeout=REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            if "id" in response.json():
                return redirect(url_for("login"))
        except requests.RequestException, ValueError:
            return (
                render_template(
                    "signup.html", error="We could not create that account."
                ),
                502,
            )
    return render_template("signup.html", error=None)


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        if not validate_csrf():
            return (
                render_template(
                    "login.html", error="Your form expired. Please try again."
                ),
                400,
            )
        try:
            response = requests.post(
                f"{SB_URL}/auth/v1/token?grant_type=password",
                headers={"apikey": SB_KEY},
                json={
                    "email": request.form.get("email"),
                    "password": request.form.get("password"),
                },
                timeout=REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            result = response.json()
            user_id = result.get("user", {}).get("id")
            if result.get("access_token") and user_id:
                session["user_id"] = user_id
                session["chat_history"] = []
                return set_auth_cookie(
                    redirect(url_for("patient_view")), result["access_token"]
                )
        except requests.RequestException, ValueError:
            return (
                render_template("login.html", error="We could not sign you in."),
                502,
            )
    return render_template("login.html", error=None)


@app.route("/logout", methods=["POST"])
def logout():
    if not validate_csrf():
        return jsonify({"error": "Invalid CSRF token"}), 400
    response = redirect(url_for("login"))
    response.delete_cookie("aura_access_token")
    session.clear()
    return response


@app.route("/patient")
def patient_view():
    if "user_id" not in session:
        return redirect(url_for("login"))
    token = get_auth_token()
    if not token:
        session.clear()
        return redirect(url_for("login"))
    profile = get_profile(session["user_id"], token)
    memories = sb_api("rest/v1/memories", auth_token=token)
    return render_template("patient.html", memories=memories, profile=profile)


@app.route("/caregiver", methods=["GET", "POST"])
def caregiver_portal():
    if "user_id" not in session:
        return redirect(url_for("login"))
    uid, token = session["user_id"], get_auth_token()
    if not token:
        session.clear()
        return redirect(url_for("login"))
    if request.method == "POST":
        if not validate_csrf():
            return (
                render_template(
                    "caregiver.html",
                    profile=get_profile(uid, token),
                    error="Your form expired. Please try again.",
                ),
                400,
            )
        form_type = request.form.get("form_type")
        if form_type == "profile":
            sb_api(
                f"rest/v1/profiles?id=eq.{uid}",
                "POST",
                {
                    "patient_name": request.form.get("p_name"),
                    "location_status": request.form.get("p_loc"),
                    "ai_personal_context": request.form.get("ai_context"),
                },
                auth_token=token,
            )
        elif form_type == "memory":
            sb_api(
                "rest/v1/memories",
                "POST",
                {
                    "user_id": uid,
                    "name": request.form.get("m_name"),
                    "relationship": request.form.get("m_rel"),
                    "image_url": request.form.get("m_url"),
                },
                auth_token=token,
            )
    profile = get_profile(uid, token)
    return render_template("caregiver.html", profile=profile, error=None)


@app.route("/api/generate_report")
def generate_report():
    if "user_id" not in session or not get_auth_token():
        return jsonify({"error": "Authentication required"}), 401

    try:
        memories = sb_api(
            f"rest/v1/memories?user_id=eq.{session['user_id']}",
            auth_token=get_auth_token(),
        )
    except requests.RequestException, RuntimeError, ValueError:
        return jsonify({"error": "Activity data is temporarily unavailable."}), 502

    memory_count = len(memories) if isinstance(memories, list) else 0
    report = (
        "Informational activity summary\n\n"
        f"Generated for the current account with {memory_count} saved memory "
        "photo(s). No clinical assessment or diagnosis is provided. "
        "Game and conversation activity is not yet recorded in this report."
    )
    return jsonify(
        {
            "report": report,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data_coverage": {
                "saved_memories": memory_count,
                "activity_events": 0,
            },
        }
    )


@app.route("/api/chat", methods=["POST"])
def chat():
    if "user_id" not in session or not get_auth_token():
        return jsonify({"error": "Authentication required"}), 401
    if not validate_csrf():
        return jsonify({"error": "Invalid CSRF token"}), 400
    payload = request.get_json(silent=True) or {}
    user_msg = payload.get("message", "").strip()
    if not user_msg:
        return jsonify({"error": "Message is required"}), 400
    profile = get_profile(session["user_id"], get_auth_token())
    messages = [
        {
            "role": "system",
            "content": f"""You are Aura, a nurturing, calm companion for {profile["patient_name"]}.
            Your tone is that of a standard American nurse.
            Speak slowly and use commas frequently to create natural pauses.
            Example: 'I am here, and I am listening, dear.'
            Keep responses to one or two sentences maximum.
            Always focus on the user's comfort.""",
        }
    ]
    messages.extend(session.get("chat_history", [])[-4:])
    messages.append({"role": "user", "content": user_msg})

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_KEY}"},
            json={
                "model": "llama-3.1-8b-instant",
                "messages": messages,
                "temperature": 0.5,
            },
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        reply = response.json()["choices"][0]["message"]["content"].strip()
    except requests.RequestException, KeyError, TypeError, ValueError:
        return jsonify(
            {"error": "Aura is temporarily unavailable. Please try again."}
        ), 502

    session.setdefault("chat_history", []).extend(
        [
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": reply},
        ]
    )
    session.modified = True
    return jsonify({"reply": reply})


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true")
