# GitHub Setup Instructions

Follow these steps to push your code to GitHub:

## Step 1: Initialize Git (if not already done)

```bash
git init
```

## Step 2: Add all files

```bash
git add .
```

## Step 3: Create initial commit

```bash
git commit -m "Initial commit: Med Mitra - AI-Powered Healthcare Platform"
```

## Step 4: Rename branch to main

```bash
git branch -M main
```

## Step 5: Add remote repository

```bash
git remote add origin https://github.com/PuneethGondela/medmitra.git
```

## Step 6: Push to GitHub

```bash
git push -u origin main
```

## ⚠️ Important Notes

1. **Sensitive Files:** Make sure these are NOT committed:
   - `firebase-service-account.json`
   - `backend/firebase-service-account.json`
   - Any `.env` files
   
   These are already in `.gitignore`

2. **If remote already exists:**
   ```bash
   git remote remove origin
   git remote add origin https://github.com/PuneethGondela/medmitra.git
   ```

3. **If you need to force push (use with caution):**
   ```bash
   git push -u origin main --force
   ```

## Verification

After pushing, verify at: https://github.com/PuneethGondela/medmitra
