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
app.use(express.json());

// Simple session simulation using query params (for demo - in production use express-session)
// Helper middleware to get current user
app.use((req, res, next) => {
  try {
    req.currentUser = (req.query && req.query.userid) || (req.body && req.body.userid) || null;
  } catch (err) {
    req.currentUser = null;
  }
  next();
});

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
  },
  searchPath: ['public'] // Explicitly set schema search path
});

console.log('SSL config:', knex.client.config.connection.ssl);
console.log('DB Host:', process.env.RDS_HOSTNAME || "localhost");
console.log('DB Name:', process.env.RDS_DB_NAME || "HabitGarden");
console.log('DB User:', process.env.RDS_USERNAME || "postgres");

// Helper function to determine growth level based on streak
function getGrowthLevelFromStreak(streak) {
  if (streak === 0) {
    return 1; // seedling
  } else if (streak >= 1 && streak <= 5) {
    return 1; // seedling
  } else if (streak >= 6 && streak <= 15) {
    return 2; // young
  } else if (streak >= 16 && streak <= 30) {
    return 3; // mature
  } else {
    return 4; // fullygrown (31+)
  }
}

// Helper function to get plant image path based on category
function getPlantImageByCategory(categoryName) {
  const categoryLower = (categoryName || '').toLowerCase();
  
  switch(categoryLower) {
    case 'intellectual':
      return '/images/plant.png';
    case 'physical':
      return '/images/redplant.png';
    case 'spiritual':
      return '/images/whiteplant.png';
    case 'social':
      return '/images/yellowplant.png';
    default:
      return '/images/plant.png'; // Default to intellectual plant
  }
}

// Test DB connection and check tables (non-blocking)
knex.raw('SELECT current_database(), current_schema()')
  .then(result => {
    console.log("✓ Database connection successful");
    console.log("  Connected to database:", result.rows[0].current_database);
    console.log("  Current schema:", result.rows[0].current_schema);
    
    // Check if tables exist
    return knex.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
  })
  .then(result => {
    if (result.rows.length > 0) {
      console.log("  Available tables:", result.rows.map(r => r.table_name).join(', '));
    } else {
      console.log("  ⚠ No tables found in public schema");
    }
  })
  .catch(err => {
    console.error('⚠ Database connection failed (app will still start):');
    console.error(`   Error: ${err.code || err.message}`);
    if (err.code === 'ENOTFOUND') {
      console.error('   → DNS lookup failed. Check if RDS hostname is correct and accessible.');
    } else if (err.code === '42P01') {
      console.error('   → Table does not exist. Check database name and schema.');
    }
  });

// index
app.get('/', (req, res) => {
  res.render('index');
});

// login
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  knex('users')
    .where({ email: email })
    .first()
    .then(user => {
      if (!user) {
        return res.render('login', { error: 'Invalid email or password' });
      }
      // Simple password check (in production, use bcrypt to compare hashed passwords)
      if (user.passwordhash === password) {
        // Redirect to dashboard with userid
        res.redirect(`/dashboard?userid=${user.userid}`);
      } else {
        res.render('login', { error: 'Invalid email or password' });
      }
    })
    .catch(err => {
      console.error('Login error:', err);
      res.render('login', { error: 'An error occurred. Please try again.' });
    });
});

// signup
app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

app.post('/signup', (req, res) => {
  const { firstname, lastname, email, password, confirm } = req.body;
  
  if (password !== confirm) {
    return res.render('signup', { error: 'Passwords do not match' });
  }
  
  // Generate username from email
  const username = email.split('@')[0];
  
  knex('users')
    .insert({
      username: username,
      passwordhash: password, // In production, hash this with bcrypt
      email: email,
      firstname: firstname,
      lastname: lastname,
      level: 'u' // default user level
    })
    .returning('userid')
    .then(([userid]) => {
      res.redirect(`/dashboard?userid=${userid}`);
    })
    .catch(err => {
      console.error('Signup error:', err);
      if (err.code === '23505') { // Unique violation
        res.render('signup', { error: 'Email already exists. Please login instead.' });
      } else {
        res.render('signup', { error: 'An error occurred. Please try again.' });
      }
    });
});

// dashboard
app.get('/dashboard', (req, res) => {
  const userid = req.query.userid;
  const searchQuery = req.query.search || '';
  
  if (!userid) {
    return res.redirect('/login');
  }
  
  // Build query with optional search
  let habitsQuery = knex('habits')
    .join('habitcategory', 'habits.category_id', 'habitcategory.category_id')
    .join('growthlevel', 'habits.growthlevel_id', 'growthlevel.growthlevel_id')
    .where({ 'habits.userid': userid });
  
  // Add search filter if provided
  if (searchQuery) {
    habitsQuery = habitsQuery.where(function() {
      this.where('habits.habitname', 'ilike', `%${searchQuery}%`)
          .orWhere('habitcategory.habitplant', 'ilike', `%${searchQuery}%`)
          .orWhere('habits.habitfrequency', 'ilike', `%${searchQuery}%`)
          .orWhere('growthlevel.growthname', 'ilike', `%${searchQuery}%`);
    });
  }
  
  // Get user info and their habits
  Promise.all([
    knex('users').where({ userid: userid }).first(),
    habitsQuery
      .select(
        'habits.habitid',
        'habits.habitname',
        'habits.habitfrequency',
        'habits.habitstreak',
        'habits.latestcompletion',
        'habits.growthlevel_id',
        'habitcategory.habitplant as category',
        'growthlevel.growthname as growthLevel'
      )
      .orderBy('habits.habitid', 'desc')
  ])
  .then(([user, habits]) => {
    if (!user) {
      return res.redirect('/login');
    }
    
    // Calculate stats and check if each habit can be completed
    const totalHabits = habits.length;
    const totalStreak = habits.reduce((sum, h) => sum + (h.habitstreak || 0), 0);
    const avgCompletion = totalHabits > 0 ? Math.round((totalStreak / totalHabits / 30) * 100) : 0;
    
    // Add completion status and ensure growth level matches streak
    const now = new Date();
    const habitsWithStatus = habits.map(habit => {
      // Ensure growth level is correct based on current streak
      const correctGrowthLevel = getGrowthLevelFromStreak(habit.habitstreak || 0);
      
      // Update growth level in database if it doesn't match (async, non-blocking)
      if (habit.growthlevel_id !== correctGrowthLevel) {
        knex('habits')
          .where({ habitid: habit.habitid, userid: userid })
          .update({ growthlevel_id: correctGrowthLevel })
          .catch(err => console.error('Error updating growth level:', err));
      }
      
      let canComplete = false;
      let timeUntilNext = null;
      
      if (!habit.latestcompletion) {
        canComplete = true;
      } else {
        const lastCompletion = new Date(habit.latestcompletion);
        const hoursSinceCompletion = (now - lastCompletion) / (1000 * 60 * 60);
        
        switch (habit.habitfrequency.toLowerCase()) {
          case 'daily':
            canComplete = hoursSinceCompletion >= 24;
            if (!canComplete) {
              const hoursRemaining = Math.ceil(24 - hoursSinceCompletion);
              timeUntilNext = `${hoursRemaining} hour(s)`;
            }
            break;
          case 'weekly':
            canComplete = hoursSinceCompletion >= 168;
            if (!canComplete) {
              const daysRemaining = Math.ceil((168 - hoursSinceCompletion) / 24);
              timeUntilNext = `${daysRemaining} day(s)`;
            }
            break;
          case 'monthly':
            canComplete = hoursSinceCompletion >= 720;
            if (!canComplete) {
              const daysRemaining = Math.ceil((720 - hoursSinceCompletion) / 24);
              timeUntilNext = `${daysRemaining} day(s)`;
            }
            break;
          default:
            canComplete = hoursSinceCompletion >= 24;
        }
      }
      
      return {
        ...habit,
        growthlevel_id: correctGrowthLevel, // Use correct growth level
        canComplete: canComplete,
        timeUntilNext: timeUntilNext
      };
    });
    
    res.render('dashboard', {
      user: user,
      habits: habitsWithStatus,
      stats: {
        totalHabits: totalHabits,
        totalStreak: totalStreak,
        completionRate: avgCompletion
      },
      error: req.query.error || null,
      success: req.query.success || null,
      searchQuery: searchQuery
    });
  })
  .catch(err => {
    console.error('Dashboard error:', err);
    res.status(500).send('Error loading dashboard');
  });
});

app.get('/logout', (req, res) => {
  res.redirect('/');
});

// add habit
app.get('/addhabit', (req, res) => {
  const userid = req.query.userid;
  if (!userid) {
    return res.redirect('/login');
  }
  
  knex('habitcategory').select('category_id', 'habitplant as category_name')
    .then((categories) => {
      res.render('addhabit', { 
        categories: categories,
        userid: userid
      });
    })
    .catch(err => {
      console.error('Failed to load data:', err);
      res.status(500).send('Could not load form data');
    });
});

app.post('/addhabit', (req, res) => {
  const { habitname, habitfrequency, category_id, userid } = req.body;
  
  if (!userid) {
    return res.redirect('/login');
  }
  
  knex('habits')
    .insert({
      userid: userid,
      category_id: category_id,
      growthlevel_id: 1, // Always start as seedling
      habitname: habitname,
      habitfrequency: habitfrequency,
      habitstreak: 0,
      latestcompletion: null
    })
    .then(() => {
      res.redirect(`/dashboard?userid=${userid}`);
    })
    .catch(err => {
      console.error('Add habit error:', err);
      res.status(500).send('Error adding habit');
    });
});

// edit habit
app.get('/edithabit/:id', (req, res) => {
  const habitid = req.params.id;
  const userid = req.query.userid;
  
  if (!userid) {
    return res.redirect('/login');
  }
  
  Promise.all([
    knex('habits').where({ habitid: habitid, userid: userid }).first(),
    knex('habitcategory').select('category_id', 'habitplant as category_name')
  ])
    .then(([habit, categories]) => {
      if (!habit) {
        return res.redirect(`/dashboard?userid=${userid}`);
      }
      res.render('edithabit', {
        habit: habit,
        categories: categories,
        userid: userid
      });
    })
    .catch(err => {
      console.error('Edit habit error:', err);
      res.status(500).send('Error loading habit');
    });
});

app.post('/edithabit', (req, res) => {
  const { habitid, habitname, habitfrequency, category_id, userid } = req.body;
  
  if (!userid) {
    return res.redirect('/login');
  }
  
  // Get current streak to determine correct growth level
  knex('habits')
    .where({ habitid: habitid, userid: userid })
    .first()
    .then(habit => {
      if (!habit) {
        return res.redirect(`/dashboard?userid=${userid}`);
      }
      
      // Calculate correct growth level based on current streak
      const correctGrowthLevel = getGrowthLevelFromStreak(habit.habitstreak || 0);
      
      // Update the habit (growth level is automatically set based on streak)
      return knex('habits')
        .where({ habitid: habitid, userid: userid })
        .update({
          habitname: habitname,
          habitfrequency: habitfrequency,
          category_id: category_id,
          growthlevel_id: correctGrowthLevel
        });
    })
    .then(() => {
      res.redirect(`/dashboard?userid=${userid}`);
    })
    .catch(err => {
      console.error('Update habit error:', err);
      res.status(500).send('Error updating habit');
    });
});

// delete habit
app.get('/deletehabit/:id', (req, res) => {
  const habitid = req.params.id;
  const userid = req.query.userid;
  
  if (!userid) {
    return res.redirect('/login');
  }
  
  knex('habits')
    .where({ habitid: habitid, userid: userid })
    .del()
    .then(() => {
      res.redirect(`/dashboard?userid=${userid}`);
    })
    .catch(err => {
      console.error('Delete habit error:', err);
      res.status(500).send('Error deleting habit');
    });
});

// complete habit (increment streak)
app.post('/completehabit', (req, res) => {
  const { habitid, userid } = req.body;
  
  if (!userid) {
    return res.redirect('/login');
  }
  
  // First, get the habit to check if it can be completed
  knex('habits')
    .where({ habitid: habitid, userid: userid })
    .first()
    .then(habit => {
      if (!habit) {
        return res.redirect(`/dashboard?userid=${userid}`);
      }
      
      // Check if habit can be completed based on frequency
      const now = new Date();
      let canComplete = false;
      let reason = '';
      
      if (!habit.latestcompletion) {
        // Never completed, can complete
        canComplete = true;
      } else {
        const lastCompletion = new Date(habit.latestcompletion);
        const hoursSinceCompletion = (now - lastCompletion) / (1000 * 60 * 60);
        
        switch (habit.habitfrequency.toLowerCase()) {
          case 'daily':
            // Can complete once per day (24 hours)
            if (hoursSinceCompletion >= 24) {
              canComplete = true;
            } else {
              const hoursRemaining = Math.ceil(24 - hoursSinceCompletion);
              reason = `Already completed today. Next completion available in ${hoursRemaining} hour(s).`;
            }
            break;
          case 'weekly':
            // Can complete once per week (168 hours)
            if (hoursSinceCompletion >= 168) {
              canComplete = true;
            } else {
              const daysRemaining = Math.ceil((168 - hoursSinceCompletion) / 24);
              reason = `Already completed this week. Next completion available in ${daysRemaining} day(s).`;
            }
            break;
          case 'monthly':
            // Can complete once per month (approximately 720 hours / 30 days)
            if (hoursSinceCompletion >= 720) {
              canComplete = true;
            } else {
              const daysRemaining = Math.ceil((720 - hoursSinceCompletion) / 24);
              reason = `Already completed this month. Next completion available in ${daysRemaining} day(s).`;
            }
            break;
          default:
            // Default to daily if frequency is unknown
            if (hoursSinceCompletion >= 24) {
              canComplete = true;
            } else {
              reason = 'Already completed recently.';
            }
        }
      }
      
      if (!canComplete) {
        // Store error message in query param and redirect
        return res.redirect(`/dashboard?userid=${userid}&error=${encodeURIComponent(reason)}`);
      }
      
      // Calculate new streak and corresponding growth level
      const newStreak = (habit.habitstreak || 0) + 1;
      const newGrowthLevel = getGrowthLevelFromStreak(newStreak);
      
      // Update the habit with new streak and growth level
      return knex('habits')
        .where({ habitid: habitid, userid: userid })
        .update({
          habitstreak: newStreak,
          growthlevel_id: newGrowthLevel,
          latestcompletion: knex.fn.now()
        });
    })
    .then(() => {
      res.redirect(`/dashboard?userid=${userid}&success=Habit completed!`);
    })
    .catch(err => {
      console.error('Complete habit error:', err);
      res.status(500).send('Error updating habit');
    });
});

// profile
app.get('/profile', (req, res) => {
  const userid = req.query.userid;
  
  if (!userid) {
    return res.redirect('/login');
  }
  
  Promise.all([
    knex('users').where({ userid: userid }).first(),
    knex('habits')
      .where({ userid: userid })
      .join('habitcategory', 'habits.category_id', 'habitcategory.category_id')
      .join('growthlevel', 'habits.growthlevel_id', 'growthlevel.growthlevel_id')
      .select('habits.*', 'habitcategory.habitplant', 'growthlevel.growthname')
  ])
    .then(([user, habits]) => {
      if (!user) {
        return res.redirect('/login');
      }
      res.render('profile', { user: user, habits: habits });
    })
    .catch(err => {
      console.error('Profile error:', err);
      res.status(500).send('Error loading profile');
    });
});

// database diagnostic route
app.get('/dbdiagnostic', (req, res) => {
  Promise.all([
    knex.raw('SELECT current_database(), current_schema(), current_user'),
    knex.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `),
    knex.raw("SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' ORDER BY table_schema, table_name")
  ])
    .then(([connInfo, publicTables, allTables]) => {
      res.json({
        connection: connInfo.rows[0],
        publicSchemaTables: publicTables.rows.map(r => r.table_name),
        allTables: allTables.rows,
        env: {
          RDS_HOSTNAME: process.env.RDS_HOSTNAME || "localhost",
          RDS_DB_NAME: process.env.RDS_DB_NAME || "HabitGarden",
          RDS_USERNAME: process.env.RDS_USERNAME || "postgres",
          RDS_PORT: process.env.RDS_PORT || 5432
        }
      });
    })
    .catch(err => {
      res.json({ error: err.message, code: err.code });
    });
});

// database test page
app.get('/dbtest', (req, res) => {
  const connectionInfo = {
    host: process.env.RDS_HOSTNAME || "localhost",
    user: process.env.RDS_USERNAME || "postgres",
    database: process.env.RDS_DB_NAME || "HabitGarden",
    port: process.env.RDS_PORT || 5432,
    ssl: knex.client.config.connection.ssl ? "enabled" : "disabled"
  };

  // Test database connection
  knex.raw('SELECT version(), current_database(), current_user, now()')
    .then(result => {
      res.render('dbtest', {
        status: 'success',
        message: 'Database connection successful!',
        connectionInfo: connectionInfo,
        dbInfo: result.rows[0]
      });
    })
    .catch(err => {
      let errorMessage = err.message;
      let troubleshooting = null;

      // Provide specific troubleshooting tips based on error type
      if (err.code === 'ENOTFOUND') {
        troubleshooting = 'DNS lookup failed. This usually means:\n• The RDS instance may have been deleted or the hostname is incorrect\n• Network connectivity issue - check if EB and RDS are in the same VPC\n• Verify the RDS endpoint in AWS Console matches the hostname above';
      } else if (err.code === 'ECONNREFUSED') {
        troubleshooting = 'Connection refused. Check:\n• RDS security groups allow inbound traffic from EB security group on port 5432\n• RDS instance is running and not stopped';
      } else if (err.code === 'ETIMEDOUT') {
        troubleshooting = 'Connection timeout. Check:\n• Network connectivity between EB and RDS\n• Security group rules\n• RDS instance is in an accessible subnet';
      } else if (err.code === '28P01') {
        troubleshooting = 'Authentication failed. Check:\n• RDS_USERNAME and RDS_PASSWORD are correct\n• Database user has proper permissions';
      } else if (err.code === '3D000') {
        troubleshooting = 'Database does not exist. Verify RDS_DB_NAME matches an existing database.';
      }

      res.render('dbtest', {
        status: 'error',
        message: 'Database connection failed!',
        connectionInfo: connectionInfo,
        error: errorMessage,
        errorCode: err.code || 'UNKNOWN',
        troubleshooting: troubleshooting
      });
    });
});


app.listen(PORT, () => console.log("Server running"));
