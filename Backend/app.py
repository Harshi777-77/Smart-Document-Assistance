import os
import requests
from pathlib import Path
from datetime import datetime, timezone
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

from db import get_conn, init_db, safe_execute

# AI service for title + text extraction
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
            safe_execute(cur, "SELECT id FROM users WHERE username = ?", (username,))
            if cur.fetchone():
                return jsonify({"message": "User already exists"}), 400

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


# ------------------- FILE UPLOAD (LOCAL) -------------------
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
            "message": "File uploaded successfully (local)",
            "title": ai_title,
            "extracted_text": extracted_text
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ------------------- FILE UPLOAD (GOOGLE DRIVE) -------------------
@app.route("/api/upload/drive", methods=["POST"])
def api_upload_drive():
    try:
        data = request.json
        user_id = data.get("user_id")
        file_id = data.get("file_id")
        access_token = data.get("access_token")

        if not user_id or not file_id or not access_token:
            return jsonify({"error": "user_id, file_id, and access_token required"}), 400

        # Get file metadata
        meta_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?fields=name,mimeType"
        headers = {"Authorization": f"Bearer {access_token}"}
        meta_res = requests.get(meta_url, headers=headers)
        if meta_res.status_code != 200:
            return jsonify({"error": "Failed to fetch file metadata from Google Drive"}), 400

        meta = meta_res.json()
        filename = secure_filename(meta["name"])

        # Download file content
        download_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
        res = requests.get(download_url, headers=headers, stream=True)
        if res.status_code != 200:
            return jsonify({"error": "Failed to download file from Google Drive"}), 400

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        dest_dir = UPLOAD_FOLDER / today
        dest_dir.mkdir(parents=True, exist_ok=True)

        save_path = dest_dir / f"{user_id}_{int(datetime.now(timezone.utc).timestamp())}_{filename}"
        with open(save_path, "wb") as f:
            for chunk in res.iter_content(1024):
                f.write(chunk)

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
            "message": "File uploaded successfully (Google Drive)",
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
            # include extracted_text too
            safe_execute(cur, "SELECT id, title, file_path, extracted_text FROM documents WHERE user_id = ?", (user_id,))
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


# ------------------- HOME ROUTE -------------------
@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Smart Document Assistant API is running 🚀"})


# ------------------- MAIN -------------------
if __name__ == "__main__":
    print("🚀 Starting Flask server on http://127.0.0.1:5000")
    init_db()
    app.run(host="127.0.0.1", port=5000, debug=True)
