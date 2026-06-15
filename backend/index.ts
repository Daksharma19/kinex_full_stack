import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import doctorRoutes from './routes/doctor.routes';
import adminRoutes from './routes/admin.routes';
import appointmentRouter from './routes/appointment.routes';
import { sendAppointmentReminders, razorpayWebhook } from './controllers/appointment.controller';


const app = express();
const PORT = process.env.PORT || 3000;

// Lock CORS to the frontend origin(s). Set FRONTEND_ORIGIN in .env (comma-
// separated for multiple). Defaults to the local Bun dev server on :5173.
// We send the Authorization header (Bearer Supabase token), so this must list
// the exact origin the frontend is served from.
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());
app.use(
  cors({
    origin: allowedOrigins,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("dev"));

// Razorpay webhook — MUST be registered before express.json() because the
// signature is verified against the RAW request bytes. Public (no auth):
// Razorpay calls it server-to-server. See razorpayWebhook in the controller.
app.post(
  '/api/v1/appointment/payment/webhook',
  express.raw({ type: 'application/json' }),
  razorpayWebhook
);

// Larger limit so base64 profile-photo uploads fit.
app.use(express.json({ limit: "8mb" }));

// handling routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/doctor', doctorRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/appointment', appointmentRouter);

// Scheduled-job endpoint (no user auth — protected by the CRON_SECRET header).
// Hit this hourly/daily from an external scheduler to send day-before video
// consultation reminder emails to patients.
app.post('/api/v1/cron/appointment-reminders', sendAppointmentReminders);



app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});