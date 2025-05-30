import { TelegramBot } from 'typescript-telegram-bot-api';
import { NextRequest, NextResponse } from 'next/server';
import { Update, Message } from 'typescript-telegram-bot-api/dist/types';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  // This error will be logged when the serverless function initializes if the token is missing.
  console.error('FATAL: TELEGRAM_BOT_TOKEN is not defined in environment variables. The bot may not work correctly.');
  // Depending on the desired behavior, you might throw an error here to halt deployment/startup if the token is critical.
  // For now, we'll allow the module to load but the bot instance will be null.
}

// Initialize bot only if token is present.
const bot = token ? new TelegramBot({ botToken: token }) : null;

// The original bot.on('message') listener is removed as its logic
// is now handled directly within the POST request handler to ensure
// asynchronous operations are properly awaited in a serverless environment.
//
// bot.on('message', async (msg) => {
//   const chatId = msg.chat.id;
//   if (msg.text) {
//     await bot.sendMessage({ chat_id: chatId, text: msg.text });
//   }
// });

export async function POST(req: NextRequest) {
  if (!bot) { // Check if bot was successfully initialized
    console.error('Error: Telegram bot is not initialized (TELEGRAM_BOT_TOKEN missing or invalid).');
    return new NextResponse('Error: Bot not configured', { status: 500 });
  }

  try {
    const body = await req.json() as Update;

    // Handle text messages
    if (body.message && body.message.text) {
      const message = body.message as Message; // Ensure correct type for message
      const chatId = message.chat.id;
      const text = message.text;
      
      // Echo the received text message
      // Ensure this operation is awaited before the function returns.
      await bot.sendMessage({ chat_id: chatId, text: `Echo: ${text}` });
    } 
    // Example: Handling callback queries (e.g., from inline keyboards)
    else if (body.callback_query) {
      const callbackQuery = body.callback_query;
      
      // It's good practice to acknowledge the callback query quickly.
      try {
        await bot.answerCallbackQuery({ callback_query_id: callbackQuery.id });
      } catch (ackError) {
        // Log error but continue if possible, as main logic might still work
        console.error('Error acknowledging callback query:', ackError);
      }
      
      const chatId = callbackQuery.message?.chat.id;
      const data = callbackQuery.data;

      if (chatId && data) {
        // Perform action based on callback_query.data and await it
        await bot.sendMessage({ chat_id: chatId, text: `Processed action: ${data}` });
      } else {
        console.log('Callback query was missing chat ID or data:', callbackQuery);
      }
    } 
    // Add more `else if` blocks here to handle other types of updates:
    // else if (body.message && body.message.photo) { /* handle photo */ }
    // else if (body.message && body.message.document) { /* handle document */ }
    // else if (body.edited_message) { /* handle edited message */ }
    // etc.
    else {
      // Log unhandled update types for debugging or future implementation
      console.log('Received unhandled or non-text/callback_query update type:', body);
    }

    // Always return a 200 OK to Telegram if processing was successful (or no action was needed)
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    // Log the detailed error for debugging
    if (error instanceof Error) {
        console.error('Error processing Telegram update:', error.message, error.stack);
    } else {
        console.error('Error processing Telegram update (unknown type):', error);
    }
    // Return a generic error response to Telegram
    // Telegram will typically retry sending the update if it receives an error response.
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}