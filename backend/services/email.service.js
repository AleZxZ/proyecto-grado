const client = require('../config/email');

const EmailService = {

  enviarPasswordTemporal: async (destinatario, nombre, passwordTemporal) => {
    await client.send({
      from: { email: 'no-reply@dentalescobar.com', name: 'Clínica Dental Escobar' },
      to: [{ email: destinatario }],
      subject: 'Restablecimiento de contraseña — Clínica Dental Escobar',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0;">
          <div style="max-width:500px; margin:40px auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            <div style="background:#162830; padding:32px; text-align:center;">
              <h1 style="color:white; margin:0; font-size:20px;">🦷 Clínica Dental Escobar</h1>
              <p style="color:rgba(255,255,255,0.6); margin:4px 0 0; font-size:13px;">Restablecimiento de contraseña</p>
            </div>
            <div style="padding:32px;">
              <p style="font-size:16px; color:#162830; font-weight:bold; margin-bottom:16px;">Hola, ${nombre}</p>
              <p style="font-size:14px; color:#4a6870; line-height:1.6; margin-bottom:24px;">
                Recibimos una solicitud para restablecer tu contraseña.
                Usa la siguiente contraseña temporal para ingresar al sistema:
              </p>
              <div style="background:#EEF4F5; border:1px solid #D0D8DC; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px;">
                <div style="font-size:12px; color:#4a6870; margin-bottom:8px;">Tu contraseña temporal</div>
                <div style="font-size:28px; font-weight:900; color:#162830; letter-spacing:4px; font-family:monospace;">${passwordTemporal}</div>
              </div>
              <div style="background:rgba(255,160,0,0.08); border:1px solid rgba(255,160,0,0.3); border-radius:10px; padding:14px; font-size:12px; color:#7a4a00; margin-bottom:24px;">
                ⚠ Por seguridad, deberás cambiar esta contraseña al ingresar al sistema.
              </div>
              <p style="font-size:14px; color:#4a6870; line-height:1.6;">
                Si no solicitaste este cambio, puedes ignorar este correo.
              </p>
            </div>
            <div style="background:#EEF4F5; padding:20px; text-align:center; font-size:11px; color:#9ca3af;">
              Clínica Dental Escobar · Sistema de Gestión Odontológica
            </div>
          </div>
        </body>
        </html>
      `,
      category: 'Password Reset',
    });
  }
};

module.exports = EmailService;


/*const transporter = require('../config/email');

const EmailService = {

  enviarPasswordTemporal: async (destinatario, nombre, passwordTemporal) => {
    await transporter.sendMail({
      from: `"Clínica Dental Escobar" <no-reply@dentalescobar.com>`,
      to:      destinatario,
      subject: 'Restablecimiento de contraseña — Clínica Dental Escobar',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0; }
            .container { max-width:500px; margin:40px auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08); }
            .header { background:#162830; padding:32px; text-align:center; }
            .header h1 { color:white; margin:0; font-size:20px; }
            .header p { color:rgba(255,255,255,0.6); margin:4px 0 0; font-size:13px; }
            .body { padding:32px; }
            .nombre { font-size:16px; color:#162830; font-weight:bold; margin-bottom:16px; }
            .mensaje { font-size:14px; color:#4a6870; line-height:1.6; margin-bottom:24px; }
            .password-box { background:#EEF4F5; border:1px solid #D0D8DC; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px; }
            .password-label { font-size:12px; color:#4a6870; margin-bottom:8px; }
            .password { font-size:28px; font-weight:900; color:#162830; letter-spacing:4px; font-family:monospace; }
            .aviso { background:rgba(255,160,0,0.08); border:1px solid rgba(255,160,0,0.3); border-radius:10px; padding:14px; font-size:12px; color:#7a4a00; margin-bottom:24px; }
            .footer { background:#EEF4F5; padding:20px; text-align:center; font-size:11px; color:#9ca3af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🦷 Clínica Dental Escobar</h1>
              <p>Restablecimiento de contraseña</p>
            </div>
            <div class="body">
              <p class="nombre">Hola, ${nombre}</p>
              <p class="mensaje">
                Recibimos una solicitud para restablecer tu contraseña. 
                Usa la siguiente contraseña temporal para ingresar al sistema:
              </p>
              <div class="password-box">
                <div class="password-label">Tu contraseña temporal</div>
                <div class="password">${passwordTemporal}</div>
              </div>
              <div class="aviso">
                ⚠ Por seguridad, deberás cambiar esta contraseña al ingresar al sistema. 
                Esta contraseña temporal expirará en 24 horas.
              </div>
              <p class="mensaje">
                Si no solicitaste este cambio, puedes ignorar este correo. 
                Tu contraseña anterior seguirá siendo válida.
              </p>
            </div>
            <div class="footer">
              Clínica Dental Escobar · Sistema de Gestión Odontológica
            </div>
          </div>
        </body>
        </html>
      `
    });
  }
};

module.exports = EmailService;*/