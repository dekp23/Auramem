# Auramem
**Advanced Digital Therapy for Alzheimer’s, Dementia, and Cognitive Support.**

Auramem is a supportive web application designed to bridge the gap between memory care and daily at-home support. By integrating **High-Speed AI (Groq LPU)**, **Cloud-Based Multi-Tenancy (Supabase)**, and **Multisensory Cognitive Exercises**, Aura provides a calming, dignified environment for patients while giving caregivers informational activity insights.

---

## Live Production URL
**Live Site:** [https://auramem.onrender.com](https://auramem.onrender.com)  
*Optimized for Tablet and Desktop use in clinical or home settings.*

---

## Core Therapeutic Features

### Generative Companion (Powered by Groq LPU)
- **Instant Response:** Utilizing Llama 3.1 via Groq’s LPU architecture to ensure sub-500ms latency, preventing patient anxiety during "loading" states.
- **Conversation Memory:** A stateless-to-stateful bridge using Flask sessions to maintain context, allowing the AI to remember the user's emotional state throughout the session.
- **Nurturing Voice Engine:** Custom implementation of the Web Speech API with an **explicit prosody filter** to maintain a slow, standard American nurse tone ($0.75x$ speed), while blacklisting international accents for better clarity in memory care.

### Clinical Cognitive Games
- **Nature Word Search:** An $8 \times 8$ grid engine with real-time word recognition. Features **Golden-Yellow** visual success cues and synthesized **C-Major major chord chimes** for positive reinforcement.
- **Accessible Crossword:** A "Frictionless" cursor engine that auto-advances on input and supports intuitive backspacing to prevent frustration.
- **Neural Face Match:** Uses high-contrast personalized photos from the user's Supabase vault to practice facial and relationship recall.

### Caregiver Control Center
- **The "AI Brain":** A unique dashboard where caregivers can "program" the AI with specific family history, names of pets, and comforting facts to prevent AI hallucinations.
- **Activity Reporting:** An informational summary of recorded activity; it is not a clinical assessment or diagnosis.

---

## Technical Stack

- **Backend:** Python (Flask) with secure session-based multi-tenancy.
- **AI Engine:** Groq Cloud (Llama-3.1-8b-instant) for low-latency inference.
- **Database & Auth:** Supabase (PostgreSQL) utilizing **Row Level Security (RLS)** to ensure data isolation between different families.
- **Frontend:** HTML5, CSS3 (Glassmorphism), Tailwind CSS, and JavaScript (ES6+).
- **Audio/Visual:** Web Audio API (Synthesized Chimes) and Embedded SVG logic for zero-dependency wave animations.

## Local development

Auramem supports Python 3.14 and generic WSGI hosting. Install runtime dependencies with
`python -m pip install -r requirements.txt`; install test and lint tools with
`python -m pip install -r requirements-dev.txt`.

Set these environment variables before starting the app:

- `FLASK_SECRET`: a long, random secret used to sign the session.
- `SUPABASE_URL` and `SUPABASE_KEY`: Supabase project credentials.
- `GROQ_API_KEY`: Groq API credential.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase admin credential required for account deletion. Never expose this value to the browser.
- `LOG_LEVEL`: optional Python logging level such as `INFO` or `DEBUG`.
- `COOKIE_SECURE=true`: enable secure auth cookies when serving over HTTPS.

The development server is not enabled in debug mode by default. Use Gunicorn for deployment,
for example `gunicorn app:app`.

The activity report expects the Supabase migration in
`supabase/migrations/001_activity_events.sql` to be applied. It creates the structured,
minimal activity-event store used for caregiver summaries and enables row-level security.
