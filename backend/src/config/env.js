import dotenv from 'dotenv';

dotenv.config();

const supportedProviders = ['openai', 'gemini', 'grok', 'deepseek'];
const defaultProvider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

if (process.env.NODE_ENV === 'production') {
  if (!supportedProviders.includes(defaultProvider)) {
    throw new Error(`Unsupported AI_PROVIDER: ${defaultProvider}`);
  }

  const providerKeyMap = {
    openai: 'OPENAI_API_KEY',
    gemini: 'GEMINI_API_KEY',
    grok: 'GROK_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY'
  };

  const keyName = providerKeyMap[defaultProvider];
  if (!process.env[keyName]) {
    throw new Error(`Missing required environment variable for provider ${defaultProvider}: ${keyName}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 8080),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  defaultProvider,
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 60)
  },
  ai: {
    requestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS || 20_000),
    retryAttempts: Number(process.env.AI_RETRY_ATTEMPTS || 2),
    retryBaseDelayMs: Number(process.env.AI_RETRY_BASE_DELAY_MS || 400)
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
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL
    }
  }
};
