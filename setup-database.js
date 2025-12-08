const knex = require('knex');
require('dotenv').config();

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.RDS_HOSTNAME || 'localhost',
    user: process.env.RDS_USERNAME || 'postgres',
    password: process.env.RDS_PASSWORD || 'password',
    database: process.env.RDS_DB_NAME || 'HabitGarden',
    port: process.env.RDS_PORT || 5432,
    ssl: { rejectUnauthorized: false }
  }
});

async function setupDatabase() {
  try {
    console.log('Setting up database tables...');

    // Create users table
    const hasUsersTable = await db.schema.hasTable('users');
    if (!hasUsersTable) {
      await db.schema.createTable('users', (table) => {
        table.increments('userid').primary();
        table.string('username', 50).notNullable();
        table.string('passwordhash', 255).notNullable();
        table.string('email', 255).notNullable().unique();
        table.string('firstname', 100);
        table.string('lastname', 100);
        table.char('level', 1).defaultTo('u');
      });
      console.log('✓ Created users table');
    } else {
      console.log('✓ users table already exists');
    }

    // Create habitcategory table
    const hasHabitCategoryTable = await db.schema.hasTable('habitcategory');
    if (!hasHabitCategoryTable) {
      await db.schema.createTable('habitcategory', (table) => {
        table.increments('category_id').primary();
        table.string('habitplant', 100).notNullable();
      });
      console.log('✓ Created habitcategory table');
      
      // Insert default categories
      await db('habitcategory').insert([
        { habitplant: 'spiritual' },
        { habitplant: 'physical' },
        { habitplant: 'social' },
        { habitplant: 'intellectual' }
      ]);
      console.log('✓ Inserted default categories');
    } else {
      console.log('✓ habitcategory table already exists');
    }

    // Create growthlevel table
    const hasGrowthLevelTable = await db.schema.hasTable('growthlevel');
    if (!hasGrowthLevelTable) {
      await db.schema.createTable('growthlevel', (table) => {
        table.increments('growthlevel_id').primary();
        table.string('growthname', 50).notNullable();
      });
      console.log('✓ Created growthlevel table');
      
      // Insert default growth levels
      await db('growthlevel').insert([
        { growthname: 'seedling' },
        { growthname: 'young' },
        { growthname: 'mature' },
        { growthname: 'fullygrown' }
      ]);
      console.log('✓ Inserted default growth levels');
    } else {
      console.log('✓ growthlevel table already exists');
    }

    // Create habits table
    const hasHabitsTable = await db.schema.hasTable('habits');
    if (!hasHabitsTable) {
      await db.schema.createTable('habits', (table) => {
        table.increments('habitid').primary();
        table.integer('userid').notNullable();
        table.integer('category_id').notNullable();
        table.integer('growthlevel_id').notNullable();
        table.string('habitname', 150).notNullable();
        table.string('habitfrequency', 20).notNullable();
        table.integer('habitstreak').defaultTo(0);
        table.timestamp('latestcompletion');
        
        table.foreign('userid').references('userid').inTable('users').onDelete('CASCADE');
        table.foreign('category_id').references('category_id').inTable('habitcategory');
        table.foreign('growthlevel_id').references('growthlevel_id').inTable('growthlevel');
      });
      console.log('✓ Created habits table');
    } else {
      console.log('✓ habits table already exists');
    }

    console.log('\n✅ Database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();

