import { connectDatabase, query, closeDatabase } from '@/config/database';
import fs from 'fs';
import path from 'path';

async function createAuditTable() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();

    console.log('Creating account deletion audit table...');
    
    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, 'create-audit-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await query(sql);
    
    console.log('Account deletion audit table created successfully!');
  } catch (error) {
    console.error('Failed to create audit table:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Run if called directly
if (require.main === module) {
  createAuditTable();
}

export { createAuditTable };