import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { OrderItem } from '../models/OrderItem';
import { Plan } from '../models/Plan';

dotenv.config();

let sequelizeConfig: any;

if (process.env.NODE_ENV === 'test') {
  // Use in-memory SQLite for tests
  sequelizeConfig = {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    models: [User, Store, Category, Product, Customer, Order, OrderItem, Plan],
  };
} else {
  sequelizeConfig = {
    database: process.env.DB_NAME || 'catalogos_bd',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    models: [User, Store, Category, Product, Customer, Order, OrderItem, Plan],
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  };
}

export const sequelize = new Sequelize(sequelizeConfig);

export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize: Conexión a MySQL exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a MySQL:', error);
    return false;
  }
};
