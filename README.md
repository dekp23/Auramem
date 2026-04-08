# Auramem
**Advanced Digital Therapy for Alzheimer’s, Dementia, and Cognitive Support.**

Auramem is a medical-grade web application designed to bridge the gap between clinical memory care and daily at-home support. By integrating **High-Speed AI (Groq LPU)**, **Cloud-Based Multi-Tenancy (Supabase)**, and **Multisensory Cognitive Exercises**, Aura provides a calming, dignified environment for patients while giving caregivers data-driven insights into cognitive trends.

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
- **Clinical Reporting:** An automated analysis engine that summarizes game performance (accuracy and response time) into professional notes for medical practitioners.

---

## Technical Stack

- **Backend:** Python (Flask) with secure session-based multi-tenancy.
- **AI Engine:** Groq Cloud (Llama-3.1-8b-instant) for low-latency inference.
- **Database & Auth:** Supabase (PostgreSQL) utilizing **Row Level Security (RLS)** to ensure data isolation between different families.
- **Frontend:** HTML5, CSS3 (Glassmorphism), Tailwind CSS, and JavaScript (ES6+).
- **Audio/Visual:** Web Audio API (Synthesized Chimes) and Embedded SVG logic for zero-dependency wave animations.
