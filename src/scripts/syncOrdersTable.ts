import { sequelize } from '../config/sequelize';

async function syncOrdersTable() {
  try {
    console.log('🔧 Actualizando tabla orders...');
    
    // Agregar delivery_cost si no existe
    try {
      await sequelize.query(`
        ALTER TABLE orders 
        ADD COLUMN delivery_cost DECIMAL(10,2) DEFAULT 0 
        AFTER subtotal;
      `);
      console.log('✅ Columna delivery_cost agregada');
    } catch (err: any) {
      if (err.original?.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna delivery_cost ya existe');
      } else {
        throw err;
      }
    }
    
    // Renombrar notes a delivery_notes si existe
    try {
      await sequelize.query(`
        ALTER TABLE orders 
        CHANGE COLUMN notes delivery_notes TEXT;
      `);
      console.log('✅ Columna notes renombrada a delivery_notes');
    } catch (err: any) {
      if (err.original?.code === 'ER_BAD_FIELD_ERROR') {
        console.log('ℹ️  Columna notes no existe (probablemente ya es delivery_notes)');
      } else {
        throw err;
      }
    }
    
    console.log('🔧 Actualizando tabla order_items...');
    
    // Agregar created_at a order_items
    try {
      await sequelize.query(`
        ALTER TABLE order_items 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log('✅ Columna created_at agregada a order_items');
    } catch (err: any) {
      if (err.original?.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna created_at ya existe en order_items');
      } else {
        throw err;
      }
    }
    
    // Agregar updated_at a order_items
    try {
      await sequelize.query(`
        ALTER TABLE order_items 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
      `);
      console.log('✅ Columna updated_at agregada a order_items');
    } catch (err: any) {
      if (err.original?.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna updated_at ya existe en order_items');
      } else {
        throw err;
      }
    }
    
    console.log('✅ Tablas actualizadas exitosamente');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

syncOrdersTable();
