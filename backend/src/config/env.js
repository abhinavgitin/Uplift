import dotenv from 'dotenv';

dotenv.config();

const requiredInProd = ['PORT', 'AI_PROVIDER'];

for (const key of requiredInProd) {
  if (!process.env[key] && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  defaultProvider: process.env.AI_PROVIDER || 'openai',
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 60)
  },
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini'
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash'
    },
    grok: {
      apiKey: process.env.GROK_API_KEY,
      model: process.env.GROK_MODEL || 'grok-beta'
    }
  }
};
