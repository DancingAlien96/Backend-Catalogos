import dotenv from 'dotenv';
import path from 'path';
import { Telegraf } from 'telegraf';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testBot() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not found in .env');
    }

    console.log('Testing bot with token:', token.substring(0, 10) + '...');
    
    const bot = new Telegraf(token);

    bot.command('start', (ctx) => {
      ctx.reply('Bot is working! 🎉');
    });

    bot.on('text', (ctx) => {
      ctx.reply(`You said: ${ctx.message.text}`);
    });

    await bot.launch();
    console.log('✅ Bot started successfully!');
    console.log('Try sending /start to your bot on Telegram');

    // Handle graceful shutdown
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testBot();
