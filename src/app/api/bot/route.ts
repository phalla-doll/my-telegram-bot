import TelegramBot from 'node-telegram-bot-api';
import { NextRequest, NextResponse } from 'next/server';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await bot.processUpdate(body);
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing update:', error);
    return new NextResponse('Error', { status: 500 });
  }
}