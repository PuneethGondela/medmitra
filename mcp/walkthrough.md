# Local AI Suite Walkthrough

## Overview
We have successfully transitioned the Med Mitra ML Server from a cloud-only dependency to a **Local-First AI Architecture** utilizing the NVIDIA RTX 4050 GPU.

## Components Implemented

### 1. Local Chat Engine (Phi-3 Mini)
- **Model**: `microsoft/Phi-3-mini-4k-instruct` (3.8B Parameters)
- **Execution**: Local GPU (NVIDIA RTX 4050)
- **Performance**: High (Quantized to float16)
- **Fallback**: Automatically falls back to Gemini API if critical errors occur.
- **Fixes Applied**: 
    - Switched from `pipeline` to `AutoModelForCausalLM` to resolve `seen_tokens` bug.
    - Set `trust_remote_code=False` to use stable `transformers` implementation.
# Med Mitra Local AI - Final Walkthrough

## 1. System Overview
- **Core Model**: `Qwen/Qwen2-1.5B-Instruct`
    - *Why?* Fits 100% in RTX 4050 VRAM (3GB). Instant responses.
- **Database**: Hybrid SQLite + Supabase
    - *Offline*: `med_mitra.db` (Local persistence)
    - *Cloud*: Syncs to Supabase `workers` and `chat_logs` tables.
- **Features**:
    - **Medical Only**: Rejects non-medical queries.
    - **Worker Profiles**: Tracks Name, Occupation, Age.
    - **Safe Motherhood**: Specialized care plans for pregnant workers (scans, yoga, alerts).

## 2. Verification Steps

### A. Server Startup
```powershell
python -m uvicorn main:app --reload
```
**Expected Output:**
- `GPU Detected: ... Loading Qwen2-1.5B (GPU)...`
- `Qwen2-1.5B Loaded Successfully!`
- `✅ Supabase Connected`

### B. Chat & Pregnancy Test
Run the interactive client:
```powershell
python interactive_chat.py
```
**Input:**
- **Name**: Anita
- **Occupation**: Stone Cutter
- **Pregnant**: **yes**
- **Query**: "I have back pain and feel dizzy."

**Expected AI Response:**
1.  **Safety First**: "Stop work immediately."
2.  **Motherhood Plan**: Suggestions for Doctor visits & Scans.
3.  **Ancient Remedy**: Specific Yoga poses (e.g., Tadasana) safe for pregnancy.
4.  **Reassurance**: "You and your baby will be safe."

## 3. Cloud Check
Go to your Supabase Dashboard:
- Check `workers` table: Should see 'Anita'.
- Check `chat_logs`: Should see the conversation.
