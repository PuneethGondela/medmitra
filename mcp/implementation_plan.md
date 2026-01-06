# ML Server Implementation Plan

## Goal
Initialize a Python-based ML server in `C:\mcp` to handle translation requests for the Med Mitra application.
We will set up a FastAPI server with a `/translate` endpoint.

## Proposed Changes

### Configuration
### Configuration
#### [NEW] [.env](file:///c:/mcp/.env)
- Store `GEMINI_API_KEY`.

#### [MODIFY] [requirements.txt](file:///c:/mcp/requirements.txt)
- Add `google-generativeai`

### Server Code
#### [MODIFY] [main.py](file:///c:/mcp/main.py)
- Import `google.generativeai`.
- Load environment variables.
- Replace mock logic with `model.generate_content` call.

## Verification Plan

### Automated Tests
- Restart the server (to load .env).
- Run `Invoke-RestMethod` to verify real translation.
