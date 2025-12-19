import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';

async function migrate() {
  console.log('🔄 Ejecutando migraciones de base de datos...');
  
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Ejecutar el schema
    const statements = schema.split('DELIMITER');
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }
    
    console.log('✅ Migraciones completadas exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en las migraciones:', error);
    process.exit(1);
  }
}

migrate();
