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

/**
 * Send email notification to test creator when someone completes their test
 */
async function notifyTestCompletion({ teacherEmail, teacherName, studentName, testTitle, score, totalPoints, percentage }) {
  const transport = getTransporter();
  if (!transport) return false; // Email not configured

  try {
    const gradeEmoji = percentage >= 90 ? '🏆' : percentage >= 75 ? '👍' : percentage >= 50 ? '📝' : '📚';

    await transport.sendMail({
      from: `"UniTest" <${process.env.SMTP_USER}>`,
      to: teacherEmail,
      subject: `📊 Новый результат: ${testTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #4F46E5; margin: 0;">UniTest</h2>
          </div>
          <div style="background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
            <p style="color: #475569; margin: 0 0 16px;">Здравствуйте, ${teacherName}!</p>
            <p style="color: #475569; margin: 0 0 16px;">Студент <strong>${studentName}</strong> завершил тест <strong>"${testTitle}"</strong>.</p>
            <div style="background: white; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e2e8f0;">
              <div style="font-size: 36px; margin-bottom: 8px;">${gradeEmoji}</div>
              <div style="font-size: 32px; font-weight: bold; color: ${percentage >= 75 ? '#059669' : percentage >= 50 ? '#d97706' : '#dc2626'};">
                ${percentage}%
              </div>
              <div style="color: #94a3b8; font-size: 14px; margin-top: 4px;">
                ${score} из ${totalPoints} баллов
              </div>
            </div>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
            Это автоматическое уведомление от UniTest
          </p>
        </div>
      `,
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
    await transport.sendMail({
      from: `"UniTest" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Восстановление пароля UniTest',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #4F46E5; margin: 0 0 16px;">Восстановление пароля</h2>
          <p style="color: #334155;">Здравствуйте, ${firstName || 'пользователь'}!</p>
          <p style="color: #334155;">Мы получили запрос на смену пароля. Если это были вы, нажмите кнопку ниже:</p>
          <p style="margin: 20px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#4F46E5;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">Сбросить пароль</a>
          </p>
          <p style="color: #64748b; font-size: 14px;">Ссылка действует 1 час. Если вы не запрашивали смену пароля, просто проигнорируйте это письмо.</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Password reset email error:', error.message);
    return false;
  }
}

module.exports = { notifyTestCompletion, sendPasswordResetEmail };
