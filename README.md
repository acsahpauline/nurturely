# nurturely

> *Notice the signs before they become scars.*

An AI-powered early warning system that helps parents identify body image concerns in children aged 10–14 — before they become a crisis.

---

## The Problem

Body image issues in teens rarely announce themselves. They hide in skipped meals, long mirror sessions, and jokes about being "too fat." By the time most parents notice, the pattern is already deep.

**1 in 3 teens** develop body image concerns between ages 10–14. Most parents miss the early signs — not because they don't care, but because nobody told them what to look for.

---

## The Solution

Nurturely gives parents:
- A framework to **log and track behavioral changes**
- An **AI that identifies patterns** across observations
- **Sensitive, actionable guidance** on how to approach their child without breaking trust
- A **community of parents** navigating similar concerns

---

## Features

- **Register & Login** — secure email/password authentication with bcrypt
- **Child Profile Setup** — baseline personality and behavior onboarding
- **Incident Logging** — log behavioral observations with categories and dates
- **Pattern Detection** — AI flags recurring patterns across logged incidents
- **AI Chat** — powered by Groq + Llama 3.3 70B, guided by a sensitive system prompt
- **Connect** — suggested parent profiles dealing with similar concerns
- **Profile Management** — photo upload, bio, edit profile
- **Support & Feedback** — complaint, suggestion, and testimonial system
- **SQLite Database** — all data persisted securely

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, Flask |
| Database | SQLite |
| AI | Groq API + Llama 3.3 70B |
| Auth | bcrypt password hashing |

---

## How to Run

**1. Clone the repository**
```bash
git clone https://github.com/acsahpauline/nurturely.git
cd nurturely
```

**2. Install dependencies**
```bash
pip install flask groq python-dotenv bcrypt
```

**3. Create a `.env` file**
```
GROQ_API_KEY=your_groq_api_key_here
```

**4. Run the app**
```bash
python app.py
```

**5. Open in browser**
```
http://127.0.0.1:5000
```