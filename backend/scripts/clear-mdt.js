import pool from '../config/database.js';

const clearMDTData = async () => {
  const client = await pool.connect();
  try {
    console.log('🧹 Clearing MDT data...');
    await client.query('BEGIN');
    const delMembers = await client.query('DELETE FROM mdt_team_members;');
    const delMeetings = await client.query('DELETE FROM mdt_meetings;');
    await client.query("ALTER SEQUENCE IF EXISTS mdt_team_members_id_seq RESTART WITH 1;");
    await client.query("ALTER SEQUENCE IF EXISTS mdt_meetings_id_seq RESTART WITH 1;");
    await client.query('COMMIT');
    console.log(`✅ Deleted ${delMembers.rowCount} team members, ${delMeetings.rowCount} meetings`);
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing MDT data:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

clearMDTData();


