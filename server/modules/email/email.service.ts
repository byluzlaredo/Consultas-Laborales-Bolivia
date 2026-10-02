import nodemailer from 'nodemailer';
import { config } from '../../config/index.js';

interface MailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private initializeTransporter(): void {
    if (this.transporter) return;

    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });
  }

  async sendPasswordResetEmail(correo: string, token: string): Promise<void> {
    this.initializeTransporter();

    const resetLink = `${config.frontend.url}/reset-password?token=${encodeURIComponent(token)}`;
    const mailOptions: MailOptions = {
      to: correo,
      from: config.email.from,
      subject: 'Recuperar contraseña - Consulta Laboral Bolivia',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1F4E34 0%, #163c2b 100%); color: white; padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Consulta Laboral Bolivia</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Recuperación de Contraseña</p>
          </div>
          
          <div style="padding: 40px 20px;">
            <h2 style="color: #1F4E34; margin-bottom: 20px;">Hola,</h2>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              Recibimos una solicitud para recuperar tu contraseña. Si no solicitaste esto, puedes ignorar este correo.
            </p>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 30px;">
              Para continuar con la recuperación de tu contraseña, haz clic en el botón de abajo:
            </p>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${resetLink}" style="
                display: inline-block;
                background-color: #1F4E34;
                color: white;
                padding: 14px 40px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
              ">Recuperar Contraseña</a>
            </div>
            
            <p style="color: #666; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
              O copia y pega este enlace en tu navegador:
            </p>
            <p style="
              background-color: #f5f5f5;
              padding: 12px;
              border-radius: 4px;
              word-break: break-all;
              color: #333;
              font-size: 12px;
            ">${resetLink}</p>
            
            <p style="color: #666; font-size: 13px; line-height: 1.6; margin-top: 30px; margin-bottom: 0;">
              Este enlace expirará en ${Math.ceil(config.resetTokenExpirySeconds / 60)} minutos por razones de seguridad.
            </p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">© 2025 Consulta Laboral Bolivia. Todos los derechos reservados.</p>
            <p style="margin: 5px 0 0 0;">Si tienes problemas, contacta a nuestro equipo de soporte.</p>
          </div>
        </div>
      `,
      text: `
        Consulta Laboral Bolivia - Recuperación de Contraseña
        
        Hola,
        
        Recibimos una solicitud para recuperar tu contraseña. Si no solicitaste esto, puedes ignorar este correo.
        
        Para continuar, accede al siguiente enlace:
        ${resetLink}
        
        Este enlace expirará en ${Math.ceil(config.resetTokenExpirySeconds / 60)} minutos por razones de seguridad.
        
        Si tienes problemas, contacta a nuestro equipo de soporte.
        
        © 2025 Consulta Laboral Bolivia
      `,
    };

    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    await this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(correo: string, nombre: string): Promise<void> {
    this.initializeTransporter();

    const mailOptions: MailOptions = {
      to: correo,
      from: config.email.from,
      subject: 'Bienvenido a Consulta Laboral Bolivia',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1F4E34 0%, #163c2b 100%); color: white; padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Consulta Laboral Bolivia</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Plataforma de Asesoría Laboral</p>
          </div>
          
          <div style="padding: 40px 20px;">
            <h2 style="color: #1F4E34; margin-bottom: 20px;">¡Bienvenido, ${nombre}!</h2>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              Tu cuenta en Consulta Laboral Bolivia ha sido creada exitosamente.
            </p>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              Ahora puedes acceder a nuestros servicios:
            </p>
            
            <ul style="color: #333; line-height: 1.8; margin-bottom: 20px; padding-left: 20px;">
              <li>💬 Chat inteligente para consultas laborales</li>
              <li>🧮 Calculadora de beneficios y prestaciones</li>
              <li>📄 Generador de documentos personalizados</li>
              <li>📚 Acceso a normativa laboral actualizada</li>
            </ul>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${config.frontend.url}/login" style="
                display: inline-block;
                background-color: #1F4E34;
                color: white;
                padding: 14px 40px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
              ">Inicia Sesión Aquí</a>
            </div>
            
            <p style="color: #666; font-size: 13px; line-height: 1.6;">
              Si tienes preguntas o necesitas ayuda, no dudes en contactarnos.
            </p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">© 2025 Consulta Laboral Bolivia. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
    };

    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    await this.transporter.sendMail(mailOptions);
  }

  async sendNotificationEmail(correo: string, subject: string, message: string): Promise<void> {
    this.initializeTransporter();

    const mailOptions: MailOptions = {
      to: correo,
      from: config.email.from,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1F4E34 0%, #163c2b 100%); color: white; padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Consulta Laboral Bolivia</h1>
          </div>
          
          <div style="padding: 40px 20px;">
            ${message}
          </div>
          
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">© 2025 Consulta Laboral Bolivia. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
    };

    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    await this.transporter.sendMail(mailOptions);
  }
}

export const emailService = new EmailService();
