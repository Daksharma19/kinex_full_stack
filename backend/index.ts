import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import morgan from 'morgan';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/v1/auth', authRoutes);
app.use(cors());
app.use(morgan("dev"));

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});