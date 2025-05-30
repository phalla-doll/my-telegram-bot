# My Telegram Bot

This is a [Next.js](https://nextjs.org) project that runs a simple Telegram bot. It's designed to be easily deployed on [Vercel](https://vercel.com).

## Features

- Handles Telegram bot updates via webhooks.
- Built with Next.js API routes.
- Uses the `typescript-telegram-bot-api` library.

## Getting Started

### Prerequisites

- Node.js (v20 or higher recommended)
- npm, yarn, pnpm, or bun
- A Telegram Bot Token (get one from [BotFather](https://t.me/botfather))

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd my-telegram-bot
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

3.  **Set up environment variables:**

    Create a `.env.local` file in the root of your project and add your Telegram Bot Token:
    ```
    TELEGRAM_BOT_TOKEN=<your_telegram_bot_token>
    ```

### Running Locally

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Your bot will be running, but to receive updates from Telegram, you'll need to set up a webhook. Telegram requires a publicly accessible HTTPS URL for webhooks. During local development, you can use a tool like [ngrok](https://ngrok.com/) to expose your local server to the internet.

Once you have a public URL (e.g., `https://your-ngrok-url.io`), you need to tell Telegram to send updates to your bot's API endpoint:

`https://your-ngrok-url.io/api/bot`

You can set the webhook using a `curl` command or by visiting the URL in your browser (replace `<YOUR_BOT_TOKEN>` and `<YOUR_WEBHOOK_URL>`):

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WEBHOOK_URL>/api/bot"
```

## Bot Logic

The main bot logic is located in `src/app/api/bot/route.ts`. This file handles incoming POST requests from Telegram.

You can extend the bot's functionality by modifying this file to handle different commands and messages.

## Deploy on Vercel

The easiest way to deploy your Next.js Telegram bot is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

1.  **Push your code to a Git repository** (e.g., GitHub, GitLab, Bitbucket).
2.  **Import your project into Vercel.**
3.  **Configure Environment Variables:**
    In your Vercel project settings, add your `TELEGRAM_BOT_TOKEN` as an environment variable.
4.  **Deploy!** Vercel will automatically build and deploy your Next.js application.
5.  **Set your Telegram Bot Webhook:**
    Once deployed, Vercel will provide you with a production URL (e.g., `https://your-project-name.vercel.app`). Use this URL to set your Telegram bot's webhook:

    ```bash
    curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-project-name.vercel.app/api/bot"
    ```
    Make sure to replace `<YOUR_BOT_TOKEN>` and `https://your-project-name.vercel.app` with your actual bot token and Vercel deployment URL.

## Learn More about Next.js

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
