import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Database } from '@jodu555/mysqlapi';
import { Email, EmailTypes } from './utils/types';

const database = Database.getDatabase();

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

    async sendEmail(userUUID: string, email_type: EmailTypes, data: any) {

        let obj: { subject: string; html: string; text: string; };
        if (email_type == 'VERIFICATION') {
            obj = this.generateEmailVerification(userUUID, data);
        }
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

    generateEmailVerification(userUUID: string, data: { username: string; verificationToken: string; }) {
        const { username, verificationToken } = data;
        const verificationLink = `http://138.201.131.52:3001/verify?token=${verificationToken}`;

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
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <h1>Email Verification</h1>
              </div>
              <div class="email-body">
                <p>Hello ${username},</p>
                <p>Thank you for signing up! To complete your registration and verify your email address, please click the button below:</p>
                
                <div style="text-align: center;">
                  <a href="${verificationLink}" class="button" style="color: white;">Verify Email Address</a>
                </div>
                
                <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
                <p style="word-break: break-all;"><a href="${verificationLink}">${verificationLink}</a></p>
                
                <p>This verification link will expire in 24 hours.</p>
                
                <p>If you didn't create an account, you can safely ignore this email.</p>
                
                <p>Best regards,<br>The Your App Team</p>
              </div>
              <div class="email-footer">
                <p>© ${new Date().getFullYear()} Your App Name. All rights reserved.</p>
                <p>If you need any assistance, please contact our support team at support@yourapp.com</p>
              </div>
            </div>
          </body>
          </html>`;

        const text = `
          Hello ${username},
          
          Thank you for signing up! To complete your registration, please verify your email address by clicking the link below:
          
          ${verificationLink}
          
          This verification link will expire in 24 hours.
          
          If you didn't create an account, you can safely ignore this email.
          
          Best regards,
          The Your App Team
        `;

        return { subject: 'Email Verification', html, text };
    }
}
