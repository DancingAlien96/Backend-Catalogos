import dotenv from 'dotenv';
import path from 'path';
import TelegramBotService from '../services/TelegramBotService';
import { sequelize } from '../config/sequelize';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function startBots() {
  try {
    console.log('🚀 Starting Telegram Bots...');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Initialize all bots
    await TelegramBotService.initializeAllBots();

    console.log('✅ All bots are running!');
    console.log('Press Ctrl+C to stop bots');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping all bots...');
      await TelegramBotService.stopAllBots();
      await sequelize.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Stopping all bots...');
      await TelegramBotService.stopAllBots();
      await sequelize.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error starting bots:', error);
    process.exit(1);
  }
}

startBots();
