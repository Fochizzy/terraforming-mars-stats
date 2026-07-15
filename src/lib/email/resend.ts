const RESEND_EMAIL_ENDPOINT = 'https://api.resend.com/emails';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildSenderAddress() {
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.SUPABASE_AUTH_FROM_EMAIL?.trim();
  const fromName =
    process.env.RESEND_FROM_NAME?.trim() ||
    process.env.SUPABASE_AUTH_SENDER_NAME?.trim() ||
    'Terraforming Mars Stats';

  if (!fromEmail) {
    throw new Error('RESEND_FROM_EMAIL is not configured.');
  }

  if (fromEmail.includes('<')) {
    return fromEmail;
  }

  return `${fromName} <${fromEmail}>`;
}

function buildPinResetEmail(recoveryUrl: string) {
  const escapedRecoveryUrl = escapeHtml(recoveryUrl);

  return {
    html: `<p>Use this secure link to reset your Terraforming Mars Stats PIN:</p>
<p><a href="${escapedRecoveryUrl}">Reset your PIN</a></p>
<p>If you did not request this, you can ignore this email.</p>`,
    text: `Use this secure link to reset your Terraforming Mars Stats PIN:\n\n${recoveryUrl}\n\nIf you did not request this, you can ignore this email.`,
  };
}

export function createResendEmailSender() {
  return {
    async sendPinResetEmail({
      recoveryUrl,
      to,
    }: {
      recoveryUrl: string;
      to: string;
    }) {
      const apiKey = process.env.RESEND_API_KEY?.trim();

      if (!apiKey) {
        throw new Error('RESEND_API_KEY is not configured.');
      }

      const email = buildPinResetEmail(recoveryUrl);
      const response = await fetch(RESEND_EMAIL_ENDPOINT, {
        body: JSON.stringify({
          from: buildSenderAddress(),
          html: email.html,
          subject: 'Reset your Terraforming Mars Stats PIN',
          text: email.text,
          to: [to],
        }),
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      });

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(
          `Resend PIN reset email failed with ${response.status}${
            details ? `: ${details}` : ''
          }`,
        );
      }
    },
  };
}
