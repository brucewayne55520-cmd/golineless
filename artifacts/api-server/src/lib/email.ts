import { logger } from "./logger";

// (#25) Cache Brevo client at module level — recreate only when API key changes
let apiInstance: { sendTransacEmail: (params: Record<string, unknown>) => Promise<unknown> } | null = null;
let cachedApiKey = "";

function getBrevoApi() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;
  // Recreate if API key changed
  if (apiInstance && cachedApiKey === apiKey) return apiInstance;

  try {
    // Dynamic import to avoid build failure when sib-api-v3-sdk is not installed
    const SibApiV3Sdk = require("sib-api-v3-sdk") as {
      ApiClient: { instance: { authentications: Record<string, { apiKey: string }> } };
      TransactionalEmailsApi: new () => { sendTransacEmail: (params: Record<string, unknown>) => Promise<unknown> };
    };
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    defaultClient.authentications["api-key"].apiKey = apiKey;
    apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    cachedApiKey = apiKey;
    logger.info("Brevo API client initialized");
    return apiInstance;
  } catch (err) {
    logger.warn({ err }, "Failed to initialize Brevo API client");
    return null;
  }
}

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  fromName?: string;
  fromEmail?: string;
}

/**
 * Send a transactional email via Brevo.
 * (#25) Uses module-level cached client, (#24) retries once on transient failure.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { to, subject, htmlContent, textContent, fromName = process.env.BREVO_SENDER_NAME || "Go LineLess", fromEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@golineless.com" } = params;

  const api = getBrevoApi();
  if (!api) {
    logger.warn({ to, subject }, "Brevo not configured — skipping email");
    return false;
  }

  const payload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to }],
    subject,
    ...(htmlContent ? { htmlContent } : {}),
    ...(textContent ? { textContent } : {}),
  };

  // (#24) Retry once on transient failure
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await api.sendTransacEmail(payload);
      logger.info({ to, subject, attempt }, "Email sent via Brevo");
      return true;
    } catch (err) {
      logger.warn({ err, to, subject, attempt }, `Brevo email attempt ${attempt} failed`);
      if (attempt === 2) return false;
      // Brief pause before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}
