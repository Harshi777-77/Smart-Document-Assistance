import sqlite3
from pathlib import Path

DB_PATH = Path("database.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def safe_execute(cursor, query, params=()):
    try:
        cursor.execute(query, params)
    except Exception as e:
        print("DB Error:", e)
        raise

def init_db():
    with get_conn() as conn:
        cur = conn.cursor()

        # Create users table with password
        safe_execute(cur, """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        """)

        # Create documents table
        safe_execute(cur, """
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                file_path TEXT NOT NULL,
                extracted_text TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)

        conn.commit()
