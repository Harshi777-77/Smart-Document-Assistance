import os
from pathlib import Path
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

from db import get_conn, init_db, safe_execute

# AI service for title generation
try:
    from ai_service import process_image_with_ai
except ImportError:
    def process_image_with_ai(path):
        return ("Untitled Document", "No extracted text")

# ------------------- FLASK APP -------------------
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = Path("uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ------------------- USER REGISTER -------------------
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return jsonify({"message": "Username and password are required"}), 400

        with get_conn() as conn:
            cur = conn.cursor()
            # Check if username already exists
            safe_execute(cur, "SELECT id FROM users WHERE username = ?", (username,))
            if cur.fetchone():
                return jsonify({"message": "User already exists"}), 400

            # Hash password and insert
            hashed_password = generate_password_hash(password)
            safe_execute(cur, "INSERT INTO users (username, password) VALUES (?, ?)", (username, hashed_password))
            conn.commit()

        return jsonify({"message": "User registered successfully"}), 201

    except Exception as e:
        return jsonify({"message": f"Error during registration: {str(e)}"}), 500


# ------------------- USER LOGIN -------------------
@app.route("/api/login", methods=["POST"])
def api_login():
    try:
        data = request.get_json()
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        with get_conn() as conn:
            cur = conn.cursor()
            safe_execute(cur, "SELECT id, password FROM users WHERE username = ?", (username,))
            row = cur.fetchone()

        if not row or not check_password_hash(row["password"], password):
            return jsonify({"error": "Invalid username or password"}), 401

        return jsonify({"message": "Login successful", "user_id": row["id"]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ------------------- FILE UPLOAD -------------------
@app.route("/api/upload", methods=["POST"])
def api_upload():
    try:
        user_id = request.form.get("user_id")
        file = request.files.get("file")

        if not user_id or not file:
            return jsonify({"error": "user_id and file required"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type"}), 400

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        dest_dir = UPLOAD_FOLDER / today
        dest_dir.mkdir(parents=True, exist_ok=True)

        filename = secure_filename(file.filename)
        save_path = dest_dir / f"{user_id}_{int(datetime.now(timezone.utc).timestamp())}_{filename}"
        file.save(str(save_path))

        # AI Generate Title
        ai_title, extracted_text = process_image_with_ai(str(save_path))

        with get_conn() as conn:
            cur = conn.cursor()
            safe_execute(cur, """
                INSERT INTO documents (user_id, title, file_path, extracted_text)
                VALUES (?, ?, ?, ?)
            """, (user_id, ai_title, str(save_path), extracted_text))
            conn.commit()
            doc_id = cur.lastrowid

        return jsonify({
            "doc_id": doc_id,
            "message": "File uploaded successfully",
            "title": ai_title,
            "extracted_text": extracted_text
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ------------------- GET DOCUMENTS -------------------
@app.route("/api/documents/<int:user_id>", methods=["GET"])
def api_get_documents(user_id):
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            safe_execute(cur, "SELECT id, title, file_path FROM documents WHERE user_id = ?", (user_id,))
            rows = cur.fetchall()
        return jsonify([dict(row) for row in rows]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ------------------- DELETE DOCUMENT -------------------
@app.route("/api/documents/<int:doc_id>", methods=["DELETE"])
def api_delete_document(doc_id):
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            safe_execute(cur, "SELECT file_path FROM documents WHERE id = ?", (doc_id,))
            row = cur.fetchone()

            if not row:
                return jsonify({"error": "Document not found"}), 404

            file_path = row["file_path"]
            if os.path.exists(file_path):
                os.remove(file_path)

            safe_execute(cur, "DELETE FROM documents WHERE id = ?", (doc_id,))
            conn.commit()

        return jsonify({"message": "Document deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ------------------- VIEW DOCUMENT -------------------
@app.route("/api/documents/view/<int:doc_id>", methods=["GET"])
def api_view_document(doc_id):
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            safe_execute(cur, "SELECT file_path FROM documents WHERE id = ?", (doc_id,))
            row = cur.fetchone()

            if not row:
                return jsonify({"error": "Document not found"}), 404

            file_path = row["file_path"]
            if not os.path.exists(file_path):
                return jsonify({"error": "File not found on disk"}), 404

            return send_file(file_path)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ------------------- MAIN -------------------
if __name__ == "__main__":
    print("🚀 Starting Flask server on http://127.0.0.1:5000")
    init_db()
    app.run(host="127.0.0.1", port=5000, debug=True)
