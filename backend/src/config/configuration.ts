export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    // Separate model for the PLU rules extraction, so a cheaper/faster model
    // can be trialed there without touching the analysis (gate any switch on
    // the eval-extraction judge verdict).
    extractionModel: process.env.OPENAI_EXTRACTION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  brevo: {
    // Transactional email via the Brevo API. When the key is unset, emails
    // are logged instead of sent.
    apiKey: process.env.BREVO_API_KEY,
    from: process.env.BREVO_FROM || 'MonUrba <no-reply@mon-urba.fr>',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
});
