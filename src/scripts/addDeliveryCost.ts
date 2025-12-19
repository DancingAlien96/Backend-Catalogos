import { sequelize } from '../config/sequelize';

async function addDeliveryCostColumn() {
  try {
    console.log('🔧 Agregando columna delivery_cost a la tabla orders...');
    
    await sequelize.query(`
      ALTER TABLE orders 
      ADD COLUMN delivery_cost DECIMAL(10,2) DEFAULT 0 
      AFTER subtotal;
    `);
    
    console.log('✅ Columna delivery_cost agregada exitosamente');
    process.exit(0);
  } catch (error: any) {
    if (error.original?.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  La columna delivery_cost ya existe');
      process.exit(0);
    } else {
      console.error('❌ Error al agregar columna:', error.message);
      process.exit(1);
    }
  }
}

addDeliveryCostColumn();
