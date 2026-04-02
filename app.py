import os
import requests
from flask import Flask, render_template, request, redirect, url_for
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# --- Supabase Config (from your .env) ---
SB_URL = os.environ.get("SUPABASE_URL")
SB_KEY = os.environ.get("SUPABASE_KEY")


# Helper to talk to Database without needing the broken Supabase library
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
        print(f"DB Error: {e}")
        return []


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/patient")
def patient_view():
    memories = db_query("memories")
    profiles = db_query("profiles")

    # Defensive check: Ensure profiles is a list and has at least one item
    if isinstance(profiles, list) and len(profiles) > 0:
        profile = profiles[0]
    else:
        # Fallback if the table is empty or doesn't exist yet
        profile = {"name": "Friend", "location_status": "at home"}

    # Defensive check for memories: Ensure it's a list
    if not isinstance(memories, list):
        memories = []

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
        return redirect(url_for("patient_view"))
    return render_template("caregiver.html")


if __name__ == "__main__":
    app.run(debug=True)
