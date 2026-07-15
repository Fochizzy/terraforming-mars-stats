import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(__dirname, '..', '..');

function requireEnvironmentVariable(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function parsePositiveInteger(value, fallback, name) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function normalizeSiteUrl(value) {
  const url = new URL(value);

  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('SUPABASE_AUTH_SITE_URL must use HTTPS outside local development.');
  }

  return url.toString().replace(/\/$/, '');
}

function splitAllowList(value) {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function readTemplate(fileName) {
  const templatePath = path.join(repositoryRoot, 'supabase', 'templates', fileName);
  return readFile(templatePath, 'utf8');
}

function redactPayload(payload) {
  const redacted = { ...payload };

  if ('smtp_pass' in redacted) {
    redacted.smtp_pass = '[REDACTED]';
  }

  for (const key of Object.keys(redacted)) {
    if (key.startsWith('mailer_templates_') && typeof redacted[key] === 'string') {
      redacted[key] = `[HTML template: ${redacted[key].length} characters]`;
    }
  }

  return redacted;
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`Supabase Management API returned ${response.status}: ${detail}`);
  }

  return body;
}

async function main() {
  const accessToken = requireEnvironmentVariable('SUPABASE_ACCESS_TOKEN');
  const projectRef = requireEnvironmentVariable('SUPABASE_PROJECT_ID');
  const siteUrl = normalizeSiteUrl(
    process.env.SUPABASE_AUTH_SITE_URL?.trim() || 'https://tm-stats.com',
  );
  const senderEmail =
    process.env.SUPABASE_AUTH_FROM_EMAIL?.trim() || 'noreply@mail.tm-stats.com';
  const senderName =
    process.env.SUPABASE_AUTH_SENDER_NAME?.trim() || 'Terraforming Mars Stats';
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const emailRateLimit = parsePositiveInteger(
    process.env.SUPABASE_AUTH_EMAILS_PER_HOUR,
    30,
    'SUPABASE_AUTH_EMAILS_PER_HOUR',
  );
  const minimumSendInterval = parsePositiveInteger(
    process.env.SUPABASE_AUTH_EMAIL_MIN_INTERVAL_SECONDS,
    60,
    'SUPABASE_AUTH_EMAIL_MIN_INTERVAL_SECONDS',
  );
  const dryRun = process.argv.includes('--dry-run');

  const [confirmationTemplate, recoveryTemplate, passwordChangedTemplate] = await Promise.all([
    readTemplate('confirmation.html'),
    readTemplate('recovery.html'),
    readTemplate('password-changed.html'),
  ]);

  const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const currentConfig = await requestJson(endpoint, { headers });
  const allowList = new Set(splitAllowList(currentConfig?.uri_allow_list));

  allowList.add(siteUrl);
  allowList.add(`${siteUrl}/**`);
  allowList.add('http://localhost:3000/**');
  allowList.add('http://127.0.0.1:3000/**');

  const payload = {
    external_email_enabled: true,
    mailer_allow_unverified_email_sign_ins: false,
    mailer_autoconfirm: false,
    mailer_notifications_password_changed_enabled: true,
    mailer_otp_exp: 3600,
    mailer_otp_length: 6,
    mailer_secure_email_change_enabled: true,
    mailer_subjects_confirmation: 'Mission Control: Confirm your access',
    mailer_subjects_password_changed_notification:
      'Mission Control: PIN changed',
    mailer_subjects_recovery: 'Mission Control: Reset your PIN',
    mailer_templates_confirmation_content: confirmationTemplate,
    mailer_templates_password_changed_notification_content: passwordChangedTemplate,
    mailer_templates_recovery_content: recoveryTemplate,
    password_min_length: 6,
    rate_limit_email_sent: emailRateLimit,
    site_url: siteUrl,
    smtp_admin_email: senderEmail,
    smtp_max_frequency: minimumSendInterval,
    smtp_sender_name: senderName,
    uri_allow_list: [...allowList].join(','),
  };

  if (resendApiKey) {
    Object.assign(payload, {
      smtp_host: 'smtp.resend.com',
      smtp_pass: resendApiKey,
      smtp_port: '587',
      smtp_user: 'resend',
    });
  }

  if (dryRun) {
    console.log(JSON.stringify(redactPayload(payload), null, 2));
    return;
  }

  await requestJson(endpoint, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  console.log(`Configured Supabase Auth email delivery for ${siteUrl}.`);
  console.log('Email confirmations are required for new accounts.');
  console.log(
    resendApiKey
      ? `Resend SMTP was configured with ${senderEmail}.`
      : 'Existing SMTP credentials were preserved because RESEND_API_KEY was not supplied.',
  );
  console.log('No auth.users records were created, updated, or deleted.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
