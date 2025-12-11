import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const presenters = [
  { name: 'Presenter 1', show_id: 1 },
  { name: 'Presenter 2', show_id: 2 },
  { name: 'Presenter 3', show_id: 3 },
  { name: 'Presenter 4', show_id: 4 },
  { name: 'Presenter 5', show_id: 5 },
  { name: 'Presenter 6', show_id: 6 },
  { name: 'Presenter 21', show_id: 21 },

  { name: 'Uplands Team', show_id: 7 },
  { name: 'Kids Crew', show_id: 8 },
  { name: 'Chef Tony', show_id: 9 },
  { name: 'Agro Experts', show_id: 10 },
  { name: 'DJ Flash', show_id: 11 },
  { name: 'Sarah', show_id: 12 },
  { name: 'Ben', show_id: 13 },
  { name: 'Emma', show_id: 13 },
  { name: 'DJ Max', show_id: 14 },
  { name: 'Sunny Crew', show_id: 15 },
  { name: 'DJ Sun', show_id: 16 },
  { name: 'Health Team', show_id: 17 },
  { name: 'Top DJs', show_id: 18 },
  { name: 'Coast Crew', show_id: 19 },
  { name: 'DJ Oldies', show_id: 20 },
];

(async () => {
  try {
    for (const p of presenters) {
      await pool.query(
        'INSERT INTO presenters (name, show_id) VALUES ($1, $2)',
        [p.name, p.show_id]
      );
    }
    console.log('Presenters seeded successfully!');
  } catch (err) {
    console.error('Error seeding presenters:', err);
  } finally {
    await pool.end();
  }
})();