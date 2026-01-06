import sqlite3
from datetime import datetime
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

DB_NAME = "med_mitra.db"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase Connected")
    except Exception as e:
        print(f"⚠️ Supabase Connection Failed: {e}")

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # Create Workers Table (Updated for Pregnancy Support & Gender)
    try:
        c.execute('ALTER TABLE workers ADD COLUMN is_pregnant BOOLEAN DEFAULT 0')
        c.execute('ALTER TABLE workers ADD COLUMN due_date TEXT')
        c.execute('ALTER TABLE workers ADD COLUMN gender TEXT') # New field
    except sqlite3.OperationalError:
        # Columns might already exist if re-running
        pass

    c.execute('''
        CREATE TABLE IF NOT EXISTS workers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            occupation TEXT,
            age INTEGER,
            gender TEXT, 
            is_pregnant BOOLEAN DEFAULT 0,
            due_date TEXT
        )
    ''')
    
    # ... rest of init_db ... 
    
    conn.commit()
    conn.close()
    print(f"Database {DB_NAME} initialized/updated.")

def get_or_create_worker(name: str, occupation: str = None, age: int = None, is_pregnant: bool = False, due_date: str = None, language: str = "hi-IN", gender: str = None):
    conn = get_db_connection()
    c = conn.cursor()
    
    # Check if worker exists locally
    c.execute('SELECT * FROM workers WHERE name = ?', (name,))
    worker = c.fetchone()
    
    local_id = None
    if worker:
        c.execute('''
            UPDATE workers 
            SET occupation = COALESCE(?, occupation), 
                age = COALESCE(?, age),
                is_pregnant = COALESCE(?, is_pregnant),
                due_date = COALESCE(?, due_date),
                gender = COALESCE(?, gender)
            WHERE id = ?
        ''', (occupation, age, is_pregnant, due_date, gender, worker['id']))
        conn.commit()
        local_id = worker['id']
    else:
        c.execute('INSERT INTO workers (name, occupation, age, is_pregnant, due_date, gender) VALUES (?, ?, ?, ?, ?, ?)', 
                  (name, occupation, age, is_pregnant, due_date, gender))
        conn.commit()
        local_id = c.lastrowid
    conn.close()

    # --- Sync to Supabase ---
    if supabase:
        try:
            # Upsert into 'users' table
            data = {
                "name": name,
                "role": "worker",
                "occupation": occupation,
                "age": age,
                "is_pregnant": is_pregnant,
                "due_date": due_date,
                "language": language,
                "gender": gender # New Field
            }
            
            # 1. Try to find existing user by Name
            res = supabase.table("users").select("id").eq("name", name).execute()
            
            if res.data:
                # Update existing
                sb_id = res.data[0]['id']
                supabase.table("users").update(data).eq("id", sb_id).execute()
            else:
                # Insert new
                supabase.table("users").insert(data).execute()
                
        except Exception as e:
            print(f"⚠️ Supabase Sync Error (User/Worker): {e}")

    return local_id

def save_chat_message(worker_id: int, role: str, content: str):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('INSERT INTO chat_logs (worker_id, role, content) VALUES (?, ?, ?)', (worker_id, role, content))
    conn.commit()
    
    # Get worker name to lookup UUID
    c.execute('SELECT name FROM workers WHERE id = ?', (worker_id,))
    worker_row = c.fetchone()
    conn.close()
    
    # --- Sync to Supabase ---
    if supabase and worker_row:
        try:
            worker_name = worker_row['name']
            
            # 1. Resolve Worker UUID from 'users' table
            res = supabase.table("users").select("id").eq("name", worker_name).execute()
            
            if res.data:
                sb_worker_id = res.data[0]['id']
                
                # 2. Insert Chat Log
                supabase.table("chat_logs").insert({
                    "worker_id": sb_worker_id,
                    "role": role,
                    "content": content
                }).execute()
            else:
                print(f"⚠️ Sync Skip: Worker '{worker_name}' not found in Cloud 'users' table.")
                
        except Exception as e:
            print(f"⚠️ Supabase Sync Error (Chat): {e}")

def get_worker_history(worker_id: int, limit: int = 10):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT role, content FROM chat_logs WHERE worker_id = ? ORDER BY timestamp DESC LIMIT ?', (worker_id, limit))
    rows = c.fetchall()
    conn.close()
    # Return in chronological order
    return [{"role": row["role"], "content": row["content"]} for row in rows][::-1]
