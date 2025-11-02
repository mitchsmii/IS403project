const express = require('express');
const app = express();
const path = require('path');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve your "images" directory directly
app.use('/images', express.static(path.join(__dirname, 'images')));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
