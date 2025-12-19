import { sequelize } from '../config/sequelize';

async function syncAllTables() {
  try {
    console.log('🔧 Sincronizando todas las tablas con los modelos...\n');
    
    // CATEGORIES
    console.log('📁 Actualizando tabla categories...');
    try {
      await sequelize.query(`
        ALTER TABLE categories 
        ADD COLUMN description TEXT AFTER name;
      `);
      console.log('✅ Columna description agregada a categories');
    } catch (err: any) {
      if (err.original?.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna description ya existe en categories');
      } else {
        throw err;
      }
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE categories 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
      `);
      console.log('✅ Columna updated_at agregada a categories');
    } catch (err: any) {
      if (err.original?.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna updated_at ya existe en categories');
      } else {
        throw err;
      }
    }
    
    // ORDERS
    console.log('\n📦 Actualizando tabla orders...');
    try {
      await sequelize.query(`
        ALTER TABLE orders 
        ADD COLUMN delivery_cost DECIMAL(10,2) DEFAULT 0 
        AFTER subtotal;
      `);
      console.log('✅ Columna delivery_cost agregada a orders');
    } catch (err: any) {
      if (err.original?.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna delivery_cost ya existe en orders');
      }
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE orders 
        CHANGE COLUMN notes delivery_notes TEXT;
      `);
      console.log('✅ Columna notes renombrada a delivery_notes en orders');
    } catch (err: any) {
      if (err.original?.code === 'ER_BAD_FIELD_ERROR') {
        console.log('ℹ️  Columna notes no existe en orders');
      }
    }
    
    // ORDER_ITEMS
    console.log('\n📝 Actualizando tabla order_items...');
    try {
      await sequelize.query(`
        ALTER TABLE order_items 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log('✅ Columna created_at agregada a order_items');
    } catch (err: any) {
      if (err.original?.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna created_at ya existe en order_items');
      }
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE order_items 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
      `);
      console.log('✅ Columna updated_at agregada a order_items');
    } catch (err: any) {
      if (err.original?.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna updated_at ya existe en order_items');
      }
    }
    
    console.log('\n🎉 Todas las tablas sincronizadas exitosamente!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

syncAllTables();
