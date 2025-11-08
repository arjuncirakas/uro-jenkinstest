import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function testSearchQuery() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing search queries...\n');
    
    // Test multiple search terms
    const searchTerms = ['peter', 'peterp', 'peterpa', 'peterpar'];
    
    for (const search of searchTerms) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Testing search term: "${search}"`);
      console.log('='.repeat(60));
      
      const searchPattern = `${search}%`;
    
    console.log('Search term:', search);
    console.log('Search pattern:', searchPattern);
    console.log('\n');
    
    // Test the query conditions
    const queries = [
      {
        name: 'Full name with space',
        query: `SELECT 'Peter Parker' as test_name, 
                CONCAT('Peter', ' ', 'Parker') ILIKE $1 as matches`,
        params: [searchPattern]
      },
      {
        name: 'Full name without space',
        query: `SELECT 'PeterParker' as test_name, 
                CONCAT('Peter', 'Parker') ILIKE $1 as matches`,
        params: [searchPattern]
      },
      {
        name: 'First name only',
        query: `SELECT 'Peter' as test_name, 
                'Peter' ILIKE $1 as matches`,
        params: [searchPattern]
      },
      {
        name: 'Email',
        query: `SELECT 'peter@yopmail.com' as test_name, 
                'peter@yopmail.com' ILIKE $1 as matches`,
        params: [searchPattern]
      }
    ];
    
    for (const test of queries) {
      console.log(`Testing: ${test.name}`);
      const result = await client.query(test.query, test.params);
      console.log(`  Result:`, result.rows[0]);
      console.log(`  Matches: ${result.rows[0].matches ? '✅ YES' : '❌ NO'}`);
      console.log('');
    }
    
      // Test the actual combined query (exactly as used in backend)
      console.log('\nTesting combined query (as used in backend):');
      const combinedQuery = `
        SELECT 
          first_name,
          last_name,
          CONCAT(first_name, ' ', last_name) as full_name_with_space,
          CONCAT(first_name, last_name) as full_name_no_space,
          email,
          CASE 
            WHEN CONCAT(first_name, ' ', last_name) ILIKE $1 THEN 'full_name_space'
            WHEN CONCAT(first_name, last_name) ILIKE $1 THEN 'full_name_no_space'
            WHEN first_name ILIKE $1 THEN 'first_name'
            WHEN email ILIKE $1 THEN 'email'
            ELSE 'none'
          END as match_type
        FROM users 
        WHERE role != 'superadmin'
          AND (
            CONCAT(first_name, ' ', last_name) ILIKE $1 OR 
            CONCAT(first_name, last_name) ILIKE $1 OR 
            first_name ILIKE $1 OR 
            email ILIKE $1
          )
        LIMIT 10
      `;
      
      const result = await client.query(combinedQuery, [searchPattern]);
      console.log(`Found ${result.rows.length} users:`);
      result.rows.forEach((row, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(`  Name: ${row.first_name} ${row.last_name}`);
        console.log(`  Full name (space): "${row.full_name_with_space}"`);
        console.log(`  Full name (no space): "${row.full_name_no_space}"`);
        console.log(`  Email: ${row.email}`);
        console.log(`  Match type: ${row.match_type}`);
      });
    
      if (result.rows.length === 0) {
        console.log('\n❌ No users found! Checking all users with "peter" in name...');
        const checkUsers = await client.query(
          `SELECT first_name, last_name, email, 
           CONCAT(first_name, ' ', last_name) as full_name_space,
           CONCAT(first_name, last_name) as full_name_no_space
           FROM users 
           WHERE role != 'superadmin' 
           AND (first_name ILIKE '%peter%' OR last_name ILIKE '%peter%' OR email ILIKE '%peter%')
           LIMIT 10`
        );
        
        if (checkUsers.rows.length > 0) {
          console.log(`\n✅ Found ${checkUsers.rows.length} users with "peter" in name:`);
          for (let idx = 0; idx < checkUsers.rows.length; idx++) {
            const user = checkUsers.rows[idx];
            console.log(`\nUser ${idx + 1}:`);
            console.log(`  First name: "${user.first_name}"`);
            console.log(`  Last name: "${user.last_name}"`);
            console.log(`  Full name (space): "${user.full_name_space}"`);
            console.log(`  Full name (no space): "${user.full_name_no_space}"`);
            console.log(`  Email: ${user.email}`);
            
            // Test if it matches
            const testMatch = await client.query(
              `SELECT 
                CONCAT($1, ' ', $2) ILIKE $3 as space_matches,
                CONCAT($1, $2) ILIKE $3 as no_space_matches,
                $1 ILIKE $3 as first_matches,
                $4 ILIKE $3 as email_matches
              `,
              [user.first_name, user.last_name, searchPattern, user.email]
            );
            console.log(`  Matches "${searchPattern}":`, testMatch.rows[0]);
          }
        } else {
          console.log('❌ No users with "peter" found in database');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testSearchQuery();

