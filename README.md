# Med Mitra - AI-Powered Healthcare Platform

A comprehensive healthcare management system connecting doctors, health workers, and patients with AI-powered assistance.

## 🏥 Features

### For Doctors
- Patient management and visit tracking
- AI-powered donor finder
- Voice-to-text prescription input
- Medical record management
- Worker assignment and monitoring

### For Health Workers
- Personal health dashboard
- Medical visit history
- AI health assistant
- Voice instructions for prescriptions
- QR code health ID
- Emergency SOS button
- Cure Map visualization

### For Administrators
- System security monitoring
- User management (doctors, workers)
- AI-powered analytics
- Audit logging

## 🚀 Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** Firebase Firestore
- **Authentication:** Firebase Authentication
- **Storage:** Firebase Storage
- **AI/ML:** Custom ML Server (Python)
- **Real-time:** Firebase Realtime Database

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase project setup
- Python 3.8+ (for ML server)
- Firebase service account key

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/PuneethGondela/medmitra.git
cd medmitra
```

### 2. Install frontend dependencies
```bash
npm install
```

### 3. Install backend dependencies
```bash
cd backend
npm install
cd ..
```

### 4. Install ML server dependencies
```bash
cd ml-server
pip install -r requirements.txt
cd ..
```

### 5. Setup Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication (Email/Password, Phone)
3. Create Firestore database
4. Enable Storage
5. Download service account key and save as:
   - `backend/firebase-service-account.json`
   - `firebase-service-account.json` (root)

### 6. Environment Variables

Create `.env` files:

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

**Backend `backend/.env`:**
```env
PORT=4000
JWT_SECRET=your_jwt_secret
ML_SERVER_URL=http://localhost:8000
FIREBASE_PROJECT_ID=your_project_id
```

## 🚀 Running the Application

### Option 1: Use PowerShell script (Windows)
```powershell
.\start-dev.ps1
```

### Option 2: Manual start

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Terminal 3 - ML Server:**
```bash
cd ml-server
python app.py
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- ML Server: http://localhost:8000

## 👤 Default Login Credentials

After seeding the admin:
- **Admin:** `admin@medimitra.in` / `admin&125`
- **Doctors:** Created by admin
- **Workers:** Created by doctors

## 📁 Project Structure

```
medmitra/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard
│   ├── doctor/            # Doctor dashboard
│   ├── worker/            # Worker dashboard
│   ├── api/               # API routes
│   └── ...
├── backend/               # Express.js backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utilities
│   └── ...
├── components/            # React components
├── lib/                   # Shared libraries
├── ml-server/             # Python ML server
└── public/                # Static assets
```

## 🔐 Security

- JWT authentication for admin/doctor APIs
- Firebase Authentication for workers
- Role-based access control
- Encrypted password storage
- Audit logging
- Rate limiting

## 🤖 AI Features

- **Health AI Assistant:** Personalized health guidance
- **Donor Finder:** AI-powered blood donor matching
- **Prescription Entity Extraction:** Automatic medicine/dosage extraction
- **Voice Instructions:** Text-to-speech for prescriptions
- **System Analytics:** AI-powered security monitoring

## 📝 API Documentation

### Admin Endpoints
- `POST /api/admin/login` - Admin login
- `POST /api/admin/create-doctor` - Create doctor account
- `GET /api/stats` - Dashboard statistics

### Doctor Endpoints
- `POST /api/doctors/login` - Doctor login
- `GET /api/doctors/:id` - Get doctor details

### Bot Endpoints
- `POST /api/bot/chat` - Chat with AI bot
- `POST /api/bot/analyze` - System analysis

## 🧪 Testing

```bash
# Backend connectivity test
cd backend
npm run test:connectivity
```

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Contributors

- Puneeth Gondela

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ for better healthcare**
