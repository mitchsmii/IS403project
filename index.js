const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve your "images" directory directly
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.urlencoded({ extended: true }));

//ADD DATABASE CONNECTION
const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.RDS_HOSTNAME || "localhost",
    user: process.env.RDS_USERNAME || "postgres",
    password: process.env.RDS_PASSWORD || "password",
    database: process.env.RDS_DB_NAME || "HabitGarden",
    port: process.env.RDS_PORT || 5432,
    ssl: { rejectUnauthorized: false }

  }
});

console.log('SSL config:', knex.client.config.connection.ssl);


knex.raw('select 1')
  .then(() => console.log("DB up"))
  .catch(err => console.error('DB error', err));

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
  knex('categories')
    .select('category_id', 'category_name') // adjust to your real columns
    .then(categories => {
      res.render('addhabit', { categories });
    })
    .catch(err => {
      console.error('Failed to load categories', err);
      res.status(500).send('Could not load categories');
    });
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
