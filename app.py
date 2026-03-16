from flask import Flask, request, jsonify, send_from_directory, session
from dotenv import load_dotenv
from groq import Groq
from database import init_db, get_db
from datetime import date as today_date
import bcrypt
import os

load_dotenv()

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = 'nurturely_secret_key_2026'

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

init_db()

@app.route("/")
def home():
    return send_from_directory('.', 'index.html')

# ===== REGISTER =====
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get("name", "")
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"success": False, "error": "All fields are required"})

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO parents (name, email, password) VALUES (?, ?, ?)",
                      (name, email, hashed))
        parent_id = cursor.lastrowid
        conn.commit()
        session['parent_id'] = parent_id
        session['parent_name'] = name
        return jsonify({"success": True, "parent_id": parent_id, "name": name})
    except Exception as e:
        return jsonify({"success": False, "error": "Email already registered"})
    finally:
        conn.close()

# ===== LOGIN =====
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM parents WHERE email = ?", (email,))
    parent = cursor.fetchone()

    if not parent:
        conn.close()
        return jsonify({"success": False, "error": "No account found with this email"})

    if not bcrypt.checkpw(password.encode('utf-8'), parent['password'].encode('utf-8')):
        conn.close()
        return jsonify({"success": False, "error": "Incorrect password"})

    # Fetch child profile
    cursor.execute("SELECT * FROM children WHERE parent_id = ? ORDER BY created_at DESC LIMIT 1",
                  (parent['id'],))
    child = cursor.fetchone()
    conn.close()

    session['parent_id'] = parent['id']
    session['parent_name'] = parent['name']

    if child:
        return jsonify({
            "success": True,
            "parent_id": parent['id'],
            "name": parent['name'],
            "bio": parent['bio'],
            "profile_pic": parent['profile_pic'],
            "child": dict(child)
    })
    else:
        return jsonify({
            "success": True,
            "parent_id": parent['id'],
            "name": parent['name'],
            "child": None
        })

# ===== ONBOARDING =====
@app.route("/onboarding", methods=["POST"])
def save_onboarding():
    data = request.get_json()
    parent_id = data.get("parent_id")
    child_name = data.get("name", "")
    child_age = data.get("age", 0)
    personality = data.get("personality", "")
    loves = data.get("loves", "")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO children (parent_id, name, age, personality, loves)
        VALUES (?, ?, ?, ?, ?)
    ''', (parent_id, child_name, child_age, personality, loves))
    child_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"success": True, "child_id": child_id, "child_name": child_name})

# ===== SAVE LOG =====
@app.route("/log", methods=["POST"])
def save_log():
    data = request.get_json()
    child_id = data.get("child_id")
    text = data.get("text", "")
    category = data.get("category", "")
    date = data.get("date", "") or str(today_date.today())

    if not child_id or not text:
        return jsonify({"success": False, "error": "Missing data"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO logs (child_id, text, category, date)
        VALUES (?, ?, ?, ?)
    ''', (child_id, text, category, date))
    conn.commit()
    conn.close()

    return jsonify({"success": True})

# ===== GET LOGS =====
@app.route("/logs/<int:child_id>", methods=["GET"])
def get_logs(child_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM logs WHERE child_id = ?
        ORDER BY created_at DESC
    ''', (child_id,))
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({"logs": logs})

# ===== AI CHAT =====
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")
    child_id = data.get("child_id")

    logs_summary = ""
    if child_id:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM logs WHERE child_id = ? ORDER BY created_at DESC", (child_id,))
        logs = [dict(row) for row in cursor.fetchall()]
        conn.close()

        if logs:
            logs_summary = "The parent has logged the following observations about their child:\n"
            for log in logs:
                logs_summary += f"- [{log['category']}] {log['text']} (on {log['date']})\n"

    system_prompt = f"""
You are Nurturely AI, a warm, sensitive, and non-judgmental assistant designed to help parents identify early body image concerns in their children aged 10-14.

Your role is to:
1. Listen to what the parent shares about their child's behaviour
2. Help them understand what these behaviours might indicate
3. Identify patterns across multiple observations if they exist
4. Guide them on how to approach their child SENSITIVELY without breaking trust
5. Never diagnose. Never alarm unnecessarily. Always be gentle.
6. If behaviours seem serious, gently suggest professional support

Important guidelines:
- Always validate the parent's concern
- Never make the parent feel like a bad parent
- Focus on CONNECTION not confrontation
- Remind parents that early awareness is powerful
- Keep responses concise, warm, and actionable

{logs_summary}

Now respond to the parent's message below with care and sensitivity.
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=500
        )
        reply = response.choices[0].message.content
    except Exception as e:
        print(f"Error: {e}")
        reply = "I'm sorry, I couldn't process that right now. Please try again in a moment. 💙"

    return jsonify({"reply": reply})

# ===== GET PROFILE =====
@app.route("/profile/<int:parent_id>", methods=["GET"])
def get_profile(parent_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, profile_pic, bio FROM parents WHERE id = ?", (parent_id,))
    parent = cursor.fetchone()
    conn.close()
    if parent:
        return jsonify({"success": True, "profile": dict(parent)})
    return jsonify({"success": False})

# ===== UPDATE PROFILE =====
@app.route("/profile/update", methods=["POST"])
def update_profile():
    parent_id = request.form.get("parent_id")
    name = request.form.get("name", "")
    bio = request.form.get("bio", "")
    profile_pic = request.files.get("profile_pic")

    pic_filename = None
    if profile_pic and profile_pic.filename:
        ext = profile_pic.filename.rsplit('.', 1)[-1].lower()
        pic_filename = f"parent_profile_{parent_id}.{ext}"
        save_path = os.path.join("static", "images", pic_filename)
        profile_pic.save(save_path)

    conn = get_db()
    cursor = conn.cursor()
    if pic_filename:
        cursor.execute("UPDATE parents SET name = ?, bio = ?, profile_pic = ? WHERE id = ?",
                      (name, bio, pic_filename, parent_id))
    else:
        cursor.execute("UPDATE parents SET name = ?, bio = ? WHERE id = ?",
                      (name, bio, parent_id))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "name": name, "pic": pic_filename})

# ===== SIGN OUT =====
@app.route("/signout", methods=["POST"])
def signout():
    session.clear()
    return jsonify({"success": True})

# ===== SUPPORT =====
@app.route("/support", methods=["POST"])
def support():
    data = request.get_json()
    parent_id = data.get("parent_id")
    message_type = data.get("type", "")
    message = data.get("message", "")
    rating = data.get("rating", None)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO support (parent_id, type, message, rating)
        VALUES (?, ?, ?, ?)
    ''', (parent_id, message_type, message, rating))
    conn.commit()
    conn.close()

    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True)