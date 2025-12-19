import dotenv from 'dotenv';
import path from 'path';
import { pool } from '../config/database';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function updateBotToken() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      console.error('❌ No se encontró TELEGRAM_BOT_TOKEN en el archivo .env');
      process.exit(1);
    }

    // Actualizar la tienda MercySales Demo con el bot token
    const [result] = await pool.query(
      'UPDATE stores SET bot_token = ? WHERE slug = ?',
      [botToken, 'mercysales-demo']
    );

    console.log('✅ Bot token actualizado para la tienda MercySales Demo');
    console.log(`   Token: ***${botToken.slice(-6)}`);
    console.log('\n🤖 Ahora puedes iniciar el bot con: npm run dev:bots');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error actualizando bot token:', error);
    process.exit(1);
  }
}

updateBotToken();
