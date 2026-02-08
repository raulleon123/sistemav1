const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDatabase } = require('./database/db');
const apiRoutes = require('./routes/api');
const installationsRoutes = require('./routes/installations');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize database
initDatabase();

// Routes
app.use('/api', apiRoutes);
app.use('/instalaciones', installationsRoutes);

// Home - redirect to new installation
app.get('/', (req, res) => {
  res.render('dashboard');
});

app.listen(PORT, () => {
  console.log(`Sistema de Fibra Óptica corriendo en http://localhost:${PORT}`);
});
