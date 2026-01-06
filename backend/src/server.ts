import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import doctorRoutes from './routes/doctor.routes';
import botRoutes from './routes/bot.routes';
import workerRoutes from './routes/worker.routes';
import donorRoutes from './routes/donor.routes';
import statsRoutes from './routes/stats.routes';
import auditRoutes from './routes/audit.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

// Security: Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(limiter);
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/admin', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/audit', auditRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Med Mitra Backend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});


// TEMPORARY DEBUG ROUTE
import { adminDb, COLLECTIONS } from './config/firebase';
import bcrypt from 'bcrypt';

app.get('/api/debug/fix-doctor', async (req, res) => {
    const email = req.query.email as string;
    if (!email) return res.send("No email provided");

    try {
        const hash = await bcrypt.hash("password123", 10);

        const docSnapshot = await adminDb.collection(COLLECTIONS.DOCTORS).where('email', '==', email).get();
        if (!docSnapshot.empty) {
            await docSnapshot.docs[0].ref.update({ password_hash: hash });
            return res.json({ status: "success", msg: "Doctor password reset to password123", id: docSnapshot.docs[0].id });
        }

        const adminSnapshot = await adminDb.collection('admins').where('email', '==', email).get();
        if (!adminSnapshot.empty) {
            await adminSnapshot.docs[0].ref.update({ password_hash: hash });
            return res.json({ status: "success", msg: "Admin password reset to password123", id: adminSnapshot.docs[0].id });
        }

        return res.json({ status: "error", msg: "User not found in Doctors or Admins" });
    } catch (e: any) {
        return res.json({ status: "error", msg: e.message });
    }
});
// END DEBUG ROUTE

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start
app.listen(PORT, () => {
    console.log(`✅ Backend server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
