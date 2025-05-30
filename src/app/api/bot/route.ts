import { TelegramBot } from 'typescript-telegram-bot-api';
import { NextRequest, NextResponse } from 'next/server';
import { Update } from 'typescript-telegram-bot-api/dist/types';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot({ botToken: token ? token : '' });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await bot.processUpdate(body as Update);
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing update:', error);
    return new NextResponse('Error', { status: 500 });
  }
}