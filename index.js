const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve your "images" directory directly
app.use('/images', express.static(path.join(__dirname, 'images')));


//ADD DATABASE CONNECTION
const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.RDS_HOSTNAME || "localhost",
    user: process.env.RDS_USERNAME || "postgres",
    password: process.env.RDS_PASSWORD || "password", 
    database: process.env.RDS_DB_NAME || "HabitGarden",
    port: process.env.RDS_PORT || 3000,
    ssl: process.env.RDS_SSL ? { rejectUnauthorized: false } : false,
  }
});


// index
app.get('/', (req, res) => {
  res.render('index');
});


// login
app.get('/login', (req, res) => {
    res.render('login');
});

// signup
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', (req, res) => {
  // add a new user to the database
})

// dashboard
app.get('/dashboard', (req, res) => {
  res.render('dashboard')
});

app.get('/logout', (req, res) => {
  // CHANGE THIS FOR LOGOUT LOGIC
  res.render('index')
})

// add habit
app.get('/addhabit', (req, res) => {
  res.render('addhabit')
});

app.post('/addhabit', (req, res) => {
  // add a habit to the database with post
})

// edit habit
app.get('/edithabit', (req, res) => {
  res.render('edithabit')
});

app.post('/edithabit', (req, res) => {
  // update database with post request
})





app.listen(PORT, () => console.log("Server running"));
