// db/seedShows.js
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // 🔹 SSL kwa Render
});

// Shows data
const shows = [
  { title:'Asubuhi Leo', start_time:'06:00:00', end_time:'10:00:00', days:['mon','tue','wed','thu','fri','sat'] },
  { title:'Sports Power', start_time:'10:00:00', end_time:'13:00:00', days:['mon','tue','wed','thu','fri'] },
  { title:'Extra Flavour', start_time:'13:00:00', end_time:'16:00:00', days:['mon','tue','wed','thu','fri'] },
  { title:'The Benchi', start_time:'16:00:00', end_time:'19:00:00', days:['mon','tue','wed','thu','fri'] },
  { title:'Sports Line', start_time:'20:00:00', end_time:'21:00:00', days:['mon','tue','wed','thu','fri','sat','sun'] },
  { title:'Mapito Yangu', start_time:'22:00:00', end_time:'23:59:00', days:['mon','tue','wed','thu'] },
  { title:'Night Show', start_time:'00:00:00', end_time:'06:00:00', days:['mon','tue','wed','thu','fri','sat','sun'] },
  { title:'Sauti Ya Watoto', start_time:'09:00:00', end_time:'10:00:00', days:['sat'] },
  { title:'Ladha Ya Kusini', start_time:'10:00:00', end_time:'13:00:00', days:['sat'] },
  { title:'Crayz Friday', start_time:'22:00:00', end_time:'23:59:00', days:['fri'] },
  { title:'Kilimo Mkwanja', start_time:'13:00:00', end_time:'14:00:00', days:['sat'] },
  { title:'Flash Back', start_time:'14:00:00', end_time:'16:00:00', days:['sat'] },
  { title:'Mwanamke Jasiri', start_time:'16:00:00', end_time:'17:00:00', days:['sat'] },
  { title:'Weekend Pause', start_time:'17:00:00', end_time:'19:00:00', days:['sat'] },
  { title:'Bampa To Bampa', start_time:'22:00:00', end_time:'23:59:00', days:['sat'] },
  { title:'Sayari Ya Upako', start_time:'06:00:00', end_time:'10:00:00', days:['sun'] },
  { title:'Sunday Special', start_time:'10:00:00', end_time:'13:00:00', days:['sun'] },
  { title:'Afya Solution', start_time:'13:00:00', end_time:'14:00:00', days:['sun'] },
  { title:'Uplands Top 20', start_time:'14:00:00', end_time:'16:00:00', days:['sun'] },
  { title:'Jahazi La Pwani', start_time:'16:00:00', end_time:'19:00:00', days:['sun'] },
  { title:'Kali Za Kale', start_time:'22:00:00', end_time:'23:59:00', days:['sun'] }
];

(async () => {
  try {
    for (const s of shows) {
      await pool.query(
        'INSERT INTO shows(title, start_time, end_time, days) VALUES($1,$2,$3,$4) ON CONFLICT(title) DO NOTHING',
        [s.title, s.start_time, s.end_time, s.days]
      );
    }
    console.log('✅ Shows seeded successfully!');
  } catch (err) {
    console.error('❌ Error seeding shows:', err);
  } finally {
    await pool.end();
  }
})();