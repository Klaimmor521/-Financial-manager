const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const goalRoutes = require('./routes/goalRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/goals', goalRoutes);

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});