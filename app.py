import os
import requests
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET", "aura_pro_stable_v10")

SB_URL = os.environ.get("SUPABASE_URL")
SB_KEY = os.environ.get("SUPABASE_KEY")
GROQ_KEY = os.environ.get("GROQ_API_KEY")


def sb_api(endpoint, method="GET", data=None, auth_token=None):
    headers = {
        "apikey": SB_KEY,
        "Authorization": f"Bearer {auth_token if auth_token else SB_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    url = f"{SB_URL}/{endpoint}"
    try:
        if method == "POST":
            return requests.post(url, headers=headers, json=data).json()
        return requests.get(url, headers=headers).json()
    except:
        return []


def get_profile(uid, token):
    data = sb_api(f"rest/v1/profiles?id=eq.{uid}", auth_token=token)
    if isinstance(data, list) and len(data) > 0:
        return data[0]
    new_p = {
        "id": uid,
        "patient_name": "Friend",
        "location_status": "at home",
        "ai_personal_context": "A kind soul.",
    }
    sb_api("rest/v1/profiles", "POST", new_p, auth_token=token)
    return new_p


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        email, pw = request.form.get("email"), request.form.get("password")
        res = requests.post(
            f"{SB_URL}/auth/v1/signup",
            headers={"apikey": SB_KEY},
            json={"email": email, "password": pw},
        ).json()
        if "id" in res:
            return redirect(url_for("login"))
    return render_template("signup.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email, pw = request.form.get("email"), request.form.get("password")
        res = requests.post(
            f"{SB_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": SB_KEY},
            json={"email": email, "password": pw},
        ).json()
        if "access_token" in res:
            session["user_token"], session["user_id"] = (
                res["access_token"],
                res["user"]["id"],
            )
            session["chat_history"] = []
            return redirect(url_for("patient_view"))
    return render_template("login.html")


@app.route("/patient")
def patient_view():
    if "user_id" not in session:
        return redirect(url_for("login"))
    profile = get_profile(session["user_id"], session["user_token"])
    memories = sb_api("rest/v1/memories", auth_token=session["user_token"])
    return render_template("patient.html", memories=memories, profile=profile)


@app.route("/caregiver", methods=["GET", "POST"])
def caregiver_portal():
    if "user_id" not in session:
        return redirect(url_for("login"))
    uid, token = session["user_id"], session["user_token"]
    if request.method == "POST":
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
    return render_template("caregiver.html", profile=profile)


@app.route("/api/chat", methods=["POST"])
def chat():
    if "user_id" not in session:
        return jsonify({"reply": "Expired"})
    user_msg = request.json.get("message")
    profile = get_profile(session["user_id"], session["user_token"])

    messages = [
        {
            "role": "system",
            "content": f"""You are Aura, a nurturing, calm companion for {profile["patient_name"]}. 
            Your tone is that of a standard American nurse. 
            Speak slowly and use commas frequently to create natural pauses. 
            Example: 'I am here, and I am listening, dear.'
            Keep responses to one or two sentences maximum. 
            Always focus on the user's comfort.""",
        },
    ]

    if "chat_history" in session:
        for m in session["chat_history"][-4:]:
            messages.append(m)
    messages.append({"role": "user", "content": user_msg})

    try:
        res = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_KEY}"},
            json={
                "model": "llama-3.1-8b-instant",
                "messages": messages,
                "temperature": 0.5,
            },
        ).json()
        reply = res["choices"][0]["message"]["content"].strip()
        session["chat_history"].append({"role": "user", "content": user_msg})
        session["chat_history"].append({"role": "assistant", "content": reply})
        session.modified = True
        return jsonify({"reply": reply})
    except:
        return jsonify({"reply": "I am right here with you. It is a lovely day."})


if __name__ == "__main__":
    app.run(debug=True)
