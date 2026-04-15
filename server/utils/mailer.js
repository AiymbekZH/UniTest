const nodemailer = require('nodemailer');

// Create transporter - configure via .env
// Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env to enable
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null; // Email not configured
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: (process.env.SMTP_PORT === '465'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

/* ── Shared email wrapper (premium layout) ── */
function emailLayout(content) {
  return `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#3b82f6 0%,#4f46e5 100%);padding:28px 32px;">
            <table width="100%"><tr>
              <td>
                <div style="display:inline-block;width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;text-align:center;line-height:36px;vertical-align:middle;">
                  <span style="color:#fff;font-weight:bold;font-size:16px;">U</span>
                </div>
                <span style="color:#fff;font-weight:700;font-size:18px;margin-left:10px;vertical-align:middle;">UniTest</span>
              </td>
            </tr></table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              UniTest &mdash; Платформа тестирования
            </p>
            <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1;text-align:center;">
              Это автоматическое уведомление. Не отвечайте на это письмо.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send email notification to test creator when someone completes their PRIVATE test.
 * Public tests do NOT trigger email notifications to avoid spamming the creator.
 */
async function notifyTestCompletion({ teacherEmail, teacherName, studentName, testTitle, score, totalPoints, percentage, testUrl }) {
  const transport = getTransporter();
  if (!transport) return false; // Email not configured

  try {
    const barColor = percentage >= 75 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444';
    const barWidth = Math.max(percentage, 3);
    const gradeLabel = percentage >= 90 ? 'Отлично' : percentage >= 75 ? 'Хорошо' : percentage >= 50 ? 'Удовлетворительно' : 'Не сдан';

    const content = `
      <p style="margin:0 0 6px;font-size:14px;color:#64748b;">Здравствуйте, ${teacherName}!</p>
      <h2 style="margin:0 0 20px;font-size:20px;color:#1e293b;font-weight:700;">Новый результат теста</h2>

      <table width="100%" style="background:#f8fafc;border-radius:12px;padding:20px;border:1px solid #e2e8f0;" cellpadding="0" cellspacing="0">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Тест</p>
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;font-weight:600;">${testTitle}</p>

          <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Студент</p>
          <p style="margin:0 0 20px;font-size:15px;color:#334155;font-weight:500;">${studentName}</p>

          <!-- Score card -->
          <table width="100%" style="background:#fff;border-radius:10px;border:1px solid #e2e8f0;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:16px 20px;text-align:center;border-right:1px solid #f1f5f9;" width="50%">
                <p style="margin:0;font-size:32px;font-weight:800;color:${barColor};">${percentage}%</p>
                <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">${gradeLabel}</p>
              </td>
              <td style="padding:16px 20px;text-align:center;" width="50%">
                <p style="margin:0;font-size:24px;font-weight:700;color:#334155;">${score}<span style="color:#94a3b8;font-weight:400;font-size:16px;">/${totalPoints}</span></p>
                <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">Баллов</p>
              </td>
            </tr>
          </table>

          <!-- Progress bar -->
          <div style="margin-top:16px;background:#e2e8f0;border-radius:6px;height:8px;overflow:hidden;">
            <div style="background:${barColor};height:8px;border-radius:6px;width:${barWidth}%;"></div>
          </div>
        </td></tr>
      </table>
    `;

    await transport.sendMail({
      from: `"UniTest" <${process.env.SMTP_USER}>`,
      to: teacherEmail,
      subject: `Новый результат: ${testTitle} — ${percentage}%`,
      html: emailLayout(content),
    });
    return true;
  } catch (error) {
    console.error('Email notification error:', error.message);
    // Don't throw — email failure shouldn't break the result submission
    return false;
  }
}

async function sendPasswordResetEmail({ email, firstName, resetUrl }) {
  const transport = getTransporter();
  if (!transport) return false;

  try {
    const content = `
      <p style="margin:0 0 6px;font-size:14px;color:#64748b;">Здравствуйте, ${firstName || 'пользователь'}!</p>
      <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b;font-weight:700;">Сброс пароля</h2>
      <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
        Мы получили запрос на смену пароля для вашего аккаунта. Нажмите кнопку ниже, чтобы создать новый пароль.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:4px 0 24px;">
          <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:14px;box-shadow:0 4px 14px rgba(59,130,246,0.35);">
            Сбросить пароль
          </a>
        </td></tr>
      </table>

      <div style="background:#f8fafc;border-radius:10px;padding:16px;border:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
          Ссылка действует <strong style="color:#64748b;">1 час</strong>. Если вы не запрашивали смену пароля, просто проигнорируйте это письмо. Ваш пароль не будет изменён.
        </p>
      </div>

      <p style="margin:20px 0 0;font-size:12px;color:#cbd5e1;">
        Если кнопка не работает, скопируйте ссылку:<br/>
        <a href="${resetUrl}" style="color:#3b82f6;word-break:break-all;font-size:11px;">${resetUrl}</a>
      </p>
    `;

    await transport.sendMail({
      from: `"UniTest" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Сброс пароля — UniTest',
      html: emailLayout(content),
    });
    return true;
  } catch (error) {
    console.error('Password reset email error:', error.message);
    return false;
  }
}

module.exports = { notifyTestCompletion, sendPasswordResetEmail };
