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

interface ChatState {
  expecting?: 'previous' | 'current' | 'price';
  previousValue?: number;
  currentValue?: number;
  price?: number;
}

// IMPORTANT: In a serverless environment, this in-memory state is ephemeral 
// and will be lost when the function instance is recycled or if you scale to multiple instances.
// For persistent state, use a database or a service like Vercel KV.
const chatStates = new Map<number, ChatState>();

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
    let chatId: number | undefined;

    if (body.message) {
      chatId = body.message.chat.id;
    } else if (body.callback_query) {
      chatId = body.callback_query.message?.chat.id;
    }

    const currentState = chatId ? chatStates.get(chatId) || {} : {};

    // 1. Handle specific commands first (e.g., /new)
    if (body.message && body.message.text && body.message.text.startsWith('/new')) {
      const message = body.message as Message;
      chatId = message.chat.id; // ensure chatId is set

      // Reset state for this chat when /new is called
      chatStates.set(chatId, {});

      await bot.sendMessage({
        chat_id: chatId,
        text: "You used /new! Please choose an option:",
        reply_markup: {
          inline_keyboard: [
            // Each inner array represents a row of buttons
            [
              { text: "ភ្លើងចាស់", callback_data: "previous_electrical_value" },
              { text: "ភ្លើងថ្មី", callback_data: "current_electrical_value" }
            ],
            [
              { text: "តម្លៃភ្លើង (1kWh)", callback_data: "price_electrical_value" }
            ]
          ]
        }
      });
    }
    // 2. Handle callback queries (e.g., from inline keyboards)
    else if (body.callback_query) {
      const callbackQuery = body.callback_query;

      // It's good practice to acknowledge the callback query quickly.
      try {
        await bot.answerCallbackQuery({ callback_query_id: callbackQuery.id });
      } catch (ackError) {
        // Log error but continue if possible, as main logic might still work
        console.error('Error acknowledging callback query:', ackError);
      }

      chatId = callbackQuery.message?.chat.id;
      const data = callbackQuery.data;

      if (chatId && data) {
        const updatedState = { ...currentState };
        if (data === "previous_electrical_value") {
          updatedState.expecting = 'previous';
          chatStates.set(chatId, updatedState);
          await bot.sendMessage({ chat_id: chatId, text: "Please enter the previous electrical value (numbers only):" });
        } else if (data === "current_electrical_value") {
          updatedState.expecting = 'current';
          chatStates.set(chatId, updatedState);
          await bot.sendMessage({ chat_id: chatId, text: "Please enter the current electrical value (numbers only):" });
        } else if (data === "price_electrical_value") {
          // This button directly sets the expectation for price,
          // useful if users want to set price independently or re-set it.
          // For the main flow, price is asked after previous/current are given.
          updatedState.expecting = 'price';
          chatStates.set(chatId, updatedState);
          await bot.sendMessage({ chat_id: chatId, text: "Please enter the price per kWh (numbers only):" });
        } else {
          await bot.sendMessage({ chat_id: chatId, text: `Processed action: ${data}` });
        }
      } else {
        console.log('Callback query was missing chat ID or data:', callbackQuery);
      }
    }
    // 3. Handle general text messages (potential inputs for values)
    else if (body.message && body.message.text && chatId) {
      // body.message.text is guaranteed to be a string here by the if condition.
      const text = body.message.text;
      const state = chatStates.get(chatId);

      if (state && state.expecting) {
        const value = parseFloat(text); // 'text' is now correctly inferred as string
        if (isNaN(value)) {
          await bot.sendMessage({ chat_id: chatId, text: `Invalid input. Please enter a number for the ${state.expecting} value:` });
        } else {
          if (state.expecting === 'previous') {
            state.previousValue = value;
          } else if (state.expecting === 'current') {
            state.currentValue = value;
          } else if (state.expecting === 'price') {
            state.price = value;
          }
          state.expecting = undefined; // Clear expectation after successful input

          // Check if we can ask for price
          if (state.previousValue !== undefined && state.currentValue !== undefined && state.price === undefined) {
            state.expecting = 'price';
            await bot.sendMessage({ chat_id: chatId, text: "Please enter the price per kWh (numbers only):" });
          }
          // Check if we can calculate
          else if (state.previousValue !== undefined && state.currentValue !== undefined && state.price !== undefined) {
            if (state.currentValue < state.previousValue) {
              await bot.sendMessage({ chat_id: chatId, text: "Error: Current electrical value cannot be less than the previous value. Please start over with /new or correct the values." });
              // Optionally clear specific values or the whole state
              delete state.previousValue;
              delete state.currentValue;
              // delete state.price; // Keep price if they want to re-enter P/C
              // state.expecting remains undefined, or set to ask for 'previous' again
            } else {
              const consumption = state.currentValue - state.previousValue;
              const totalCost = consumption * state.price;
              await bot.sendMessage({
                chat_id: chatId,
                text: `Calculation Complete:\nPrevious Value: ${state.previousValue}\nCurrent Value: ${state.currentValue}\nConsumption: ${consumption.toFixed(2)} kWh\nPrice per kWh: ${state.price.toFixed(2)}\nTotal Cost: ${totalCost.toFixed(2)}`
              });
              chatStates.delete(chatId); // Clear state after successful calculation
            }
          }
          if (chatStates.has(chatId)) { // if not deleted
            chatStates.set(chatId, state);
          }
        }
      } else {
        // Default echo for non-command, non-expected input
        await bot.sendMessage({ chat_id: chatId, text: `Echo: ${text}` });
      }
    }
    // Add more `else if` blocks here to handle other types of updates:
    // else if (body.message && body.message.photo) { /* handle photo */ }
    // else if (body.message && body.message.document) { /* handle document */ }
    // else if (body.edited_message) { /* handle edited message */ }
    // etc.
    else {
      // Log unhandled update types for debugging or future implementation
      console.log('Received unhandled update type or missing chat ID:', body);
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