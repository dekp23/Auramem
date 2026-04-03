import os
import requests
from flask import Flask, render_template, request, jsonify
from openai import OpenAI
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
ai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Supabase Config
SB_URL = os.environ.get("SUPABASE_URL")
SB_KEY = os.environ.get("SUPABASE_KEY")


def db_query(table, method="GET", data=None):
    headers = {
        "apikey": SB_KEY,
        "Authorization": f"Bearer {SB_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    url = f"{SB_URL}/rest/v1/{table}"
    try:
        if method == "POST":
            return requests.post(url, headers=headers, json=data).json()
        return requests.get(url, headers=headers).json()
    except Exception as e:
        print(f"Database error: {e}")
        return []


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/patient")
def patient_view():
    memories = db_query("memories")
    profiles = db_query("profiles")
    profile = (
        profiles[0]
        if (isinstance(profiles, list) and len(profiles) > 0)
        else {"name": "Friend", "location_status": "at home"}
    )
    return render_template("patient.html", memories=memories, profile=profile)


@app.route("/caregiver", methods=["GET", "POST"])
def caregiver_view():
    if request.method == "POST":
        new_memory = {
            "name": request.form.get("name"),
            "relationship": request.form.get("relation"),
            "message": request.form.get("message"),
            "image_url": request.form.get("image_url"),
        }
        db_query("memories", method="POST", data=new_memory)
    return render_template("caregiver.html")


@app.route("/api/daily_muse")
def daily_muse():
    profile = db_query("profiles")[0]
    memories = db_query("memories")
    family = [m["name"] for m in memories]

    prompt = f"Write a 2-sentence comforting morning letter for {profile['name']} who has memory loss. Mention their loved ones: {', '.join(family)}. Be nurturing and simple."
    try:
        response = ai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a gentle memory-care assistant.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        msg = response.choices[0].message.content
    except:
        msg = f"Good morning, {profile['name']}. It is a beautiful day to be with your family."

    return jsonify({"message": msg})


@app.route("/log_game", methods=["POST"])
def log_game():
    data = request.json
    db_query(
        "cognitive_logs",
        method="POST",
        data={
            "game_type": data["type"],
            "accuracy": data["accuracy"],
            "response_time": data["time"],
            "logged_at": datetime.now().isoformat(),
        },
    )
    return jsonify({"status": "logged"})


if __name__ == "__main__":
    app.run(debug=True)
