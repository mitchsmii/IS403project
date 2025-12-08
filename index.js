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

// garden
app.get('/garden', (req, res) => {
  const plants = [
    { name: 'Physical', stage: 1 },
    { name: 'Social', stage: 2 },
    { name: 'Intellectual', stage: 3 },
    { name: 'Spiritual', stage: 4 },
  ];

  const quotes = [
    { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
    { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
    { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
    { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas A. Edison" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
    { text: "The harder I work, the luckier I get.", author: "Gary Player" },
    { text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington" },
    { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
    { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar" },
    { text: "Act as if what you do makes a difference. It does.", author: "William James" },
    { text: "The mind is everything. What you think you become.", author: "Buddha" },
    { text: "An unexamined life is not worth living.", author: "Socrates" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" }
  ];

  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  res.render('garden', { plants, quote: randomQuote });
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
