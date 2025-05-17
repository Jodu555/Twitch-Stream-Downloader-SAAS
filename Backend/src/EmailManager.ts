import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Database } from '@jodu555/mysqlapi';
import { Email, EmailTypes } from './utils/types';

const database = Database.getDatabase();

// type EmailTypeData<K extends EmailTypes> = {
//     [key in K]: K extends 'VERIFICATION' ? { email: string; verificationToken: string; } : K extends 'DISCOUNT' ? { discountAmount: number; discountCode: string; } : never;
// };

// type EmailTypeDataD = {
//     VERIFICATION: { email: string; verificationToken: string; };
//     DISCOUNT: { discountAmount: number; discountCode: string; };
// } & Record<EmailTypes, { [key: string]: string; }>;

// export type EmailTypes = 'VERIFICATION' | 'INVOICE_OPENED' | 'INVOICE_DUE' | 'DISCOUNT' | 'VIDEO_ABT_DELETED' | 'RECORDING_AUTO_STARTED' | 'RECORDING_AUTO_ENDED';

// type DataType<T extends EmailTypes> = T extends 'VERIFICATION' ? { email: string; verificationToken: string; } : never;

// type DataType<T> = T extends 'VERIFICATION' ? { email: string; verificationToken: string; } : never;

type DataType<T> = T extends 'VERIFICATION' ? { email: string; verificationToken: string; } :
  T extends 'DISCOUNT' ? { discountAmount: number; discountCode: string; } :
  T extends 'VIDEO_ABT_DELETED' ? { videoName: string; } :
  T extends 'RECORDING_AUTO_STARTED' ? { streamerName: string; } :
  T extends 'RECORDING_AUTO_ENDED' ? { streamerName: string; } :
  undefined;

export default class EmailManager {
  transporter: nodemailer.Transporter;
  ready: boolean = false;
  constructor() {
    // const config = {
    //     service: 'gmail',
    //     host: process.env.MAIL_APP_HOST,
    //     port: parseInt(process.env.MAIL_APP_PORT),
    //     secure: true,
    //     auth: {
    //         user: process.env.MAIL_APP_MAIL,
    //         pass: process.env.MAIL_APP_PASSWORD,
    //     },
    // };
    // console.log(config);

    // this.transporter = nodemailer.createTransport(config);

    // this.transporter.verify(function (error, success) {
    //     console.log({ error, success });

    //     if (error) {
    //         console.log('Error verifying email transporter:', error);
    //     }
    //     if (success) {
    //         console.log('Email transporter is ready');
    //         this.ready = true;
    //     }
    // });
  }

  async processEmails() {
    const emails = await database.get<Email>('emails').get({ status: 'PENDING' });
    for (const email of emails) {
      if (email.status == 'PENDING') {
        await this.deepSendEmail(email);
      }
    }
  }


  async sendEmail<T extends EmailTypes>(userUUID: string, email_type: T, data: DataType<T>) {
    const obj = this.getEmailData(email_type, data);

    const email: Email = {
      ID: crypto.randomUUID(),
      userUUID,
      email_type,
      status: 'PENDING',
      data: JSON.stringify(data),
      sent_at: null,
      created_at: Date.now(),
      ...obj,
    } satisfies Email;

    database.get<Email>('emails').create(email);

    // await this.deepSendEmail(email);
  }

  getEmailData<T extends EmailTypes>(email_type: T, data: any) {
    if (email_type === 'VERIFICATION') {
      return this.generateEmailVerification(data);
    }
    if (email_type === 'DISCOUNT') {
      data;
    }
  }

  private async deepSendEmail(email: Email) {
    if (!this.ready) {
      console.log('Email transporter not ready for', email);
      return;
    }
    const data = JSON.parse(email.data);

    // this.transporter.sendMail(
    //     {
    //         from: process.env.MAIL_APP_MAIL,
    //         to: 'Jodu505@gmail.com',
    //         ...obj,
    //     },
    //     function (error, info) {
    //         if (error) {
    //             console.log(error);
    //             return;
    //         } else {
    //             console.log('Email sent: ' + info);
    //             email.sent_at = Date.now();
    //             email.status = 'SENT';
    //             database.get<Email>('emails').update({ ID: email.ID }, email);
    //         }
    //     }
    // );
  }

  generateEmailVerification(data: DataType<'VERIFICATION'>) {
    const { email, verificationToken } = data;

    const html = `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .email-container {
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid #e0e0e0;
              }
              .email-header {
                background-color: #4f46e5;
                padding: 20px;
                text-align: center;
              }
              .email-header h1 {
                color: white;
                margin: 0;
                font-size: 24px;
              }
              .email-body {
                background-color: #ffffff;
                padding: 30px;
              }
              .email-footer {
                background-color: #f9fafb;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #6b7280;
              }
              .button {
                display: inline-block;
                background-color: #4f46e5;
                color: white;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 4px;
                font-weight: bold;
                margin: 20px 0;
              }
              .code {
                background-color: #f1f5f9;
                padding: 12px;
                border-radius: 4px;
                font-family: monospace;
                text-align: center;
                font-size: 18px;
                letter-spacing: 2px;
                margin: 20px 0;
                color: #4f46e5;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <h1>Email Verification</h1>
              </div>
              <div class="email-body">
                <p>Hello ${email},</p>
                <p>Thank you for signing up! To complete your registration and verify your email address, please input the following code on the registration page:</p>
                
                <div style="text-align: center;">
                  <h3 class="code">${verificationToken}</h3>
                </div>
                
                <p>This verification code will expire in 48 hours. You then have to reregister!</p>
                
                <p>If you didn't create an account, you can safely ignore this email.</p>
                
                <p>Best regards,<br>The TwitchRecorder App</p>
              </div>
              <div class="email-footer">
                <p>© ${new Date().getFullYear()} TwitchStreamRecorder. All rights reserved.</p>
                <p>If you need any assistance, please just reply to this email!</p>
              </div>
            </div>
          </body>
          </html>`;

    const text = `
          Hello ${email},
          
          Thank you for signing up! To complete your registration, please input the following code on the registration page:
          
          ${verificationToken}
          
          This verification token will expire in 48 hours. You then have to reregister!
          
          If you didn't create an account, you can safely ignore this email.
          
          Best regards,
          The TwitchStreamRecorder App
        `;

    return { subject: 'Email Verification', html, text };
  }
}
