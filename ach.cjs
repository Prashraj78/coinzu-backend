require('dotenv').config();
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await c.connect();
  const r = await c.query('select count(*)::int n from achievements');
  console.log('achievements rows:', r.rows[0].n);
  if (r.rows[0].n) {
    const s = await c.query('select title, criteria_type, rarity, points, icon_url from achievements order by title limit 40');
    console.table(s.rows);
  }
  const dt = await c.query("select type_key, label from dropdown_types order by type_key");
  console.log('dropdown types:', dt.rows.map(x=>x.type_key).join(', '));
  await c.end();
})().catch((e) => console.error('ERR', e.message));
