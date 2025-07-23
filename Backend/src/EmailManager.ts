import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Database } from '@jodu555/mysqlapi';
import { Account, DatabaseInvoice, Email, EmailTypes } from './utils/types';

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

type DataType<T> =
    T extends 'VERIFICATION' ? { verificationToken: string; } :
    T extends 'DISCOUNT' ? { discountAmount: number; discountCode: string; expiryDate: number; } :
    T extends 'VIDEO_ABT_DELETED' ? { videoName: string; deleteDate: number; } :
    T extends 'RECORDING_AUTO_STARTED' ? { streamerName: string; } :
    T extends 'RECORDING_AUTO_ENDED' ? { streamerName: string; } :
    T extends 'INVOICE_OPENED' ? { invoiceID: string; } :
    T extends 'INVOICE_DUE' ? { invoiceID: string; } :
    undefined;

export default class EmailManager {
    transporter: nodemailer.Transporter;
    ready: boolean = false;
    inflight: boolean = false;
    constructor() {
        const config = {
            service: 'gmail',
            host: process.env.MAIL_APP_HOST,
            port: parseInt(process.env.MAIL_APP_PORT),
            secure: true,
            auth: {
                user: process.env.MAIL_APP_MAIL,
                pass: process.env.MAIL_APP_PASSWORD,
            },
        };
        console.log(config);

        this.transporter = nodemailer.createTransport(config);

        let outherThis = this;
        this.transporter.verify(function (error, success) {
            console.log({ error, success });

            if (error) {
                console.log('Error verifying email transporter:', error);
            }
            if (success) {
                console.log('Email transporter is ready');
                outherThis.ready = true;
                outherThis.processEmails();
            }
        });
    }

    async processEmails() {
        // console.log('Processing emails...', this.ready, this.inflight);
        if (!this.ready) {
            console.log('Email transporter not ready, skipping email processing');
            setTimeout(() => this.processEmails(), 1000 * 60 * 5); // Retry in 5 minutes
            return;
        }
        if (this.inflight) {
            console.log('Email processing already in flight, skipping this round');
            setTimeout(() => this.processEmails(), 1000 * 60 * 5); // Retry in 5 minutes
            return;
        }
        const emails = await database.get<Email>('emails').get({ status: 'PENDING' });
        for (const email of emails) {
            if (email.status == 'PENDING') {
                await this.deepSendEmail(email);
            }
        }
        setTimeout(() => this.processEmails(), 1000 * 60 * 5); // Check for stall emails every 5 minutes
    }

    async sendEmail<T extends EmailTypes>(userUUID: string, email_type: T, data: DataType<T> & { email?: string; }) {
        this.inflight = true;
        try {

            data.email = data.email || (await database.get<Account>('accounts').getOne({ UUID: userUUID }))?.email;
            const obj = await this.getEmailData(email_type, data);

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

            await database.get<Email>('emails').create(email);

            await this.deepSendEmail(email);
        } catch (error) {
            console.log('Error sending email:', error, userUUID, email_type, data);
        } finally {
            this.inflight = false;
        }
    }

    async getEmailData<T extends EmailTypes>(email_type: T, data: any) {
        if (email_type === 'VERIFICATION') {
            return this.generateEmailVerification(data);
        }
        if (email_type === 'DISCOUNT') {
            return this.generateEmailDiscount(data);
        }
        if (email_type === 'VIDEO_ABT_DELETED') {
            return this.generateEmailVideoAboutToBeDeleted(data);
        }
        if (email_type === 'RECORDING_AUTO_STARTED') {
            return this.generateEmailRecordingAutoStarted(data);
        }
        if (email_type === 'RECORDING_AUTO_ENDED') {
            return this.generateEmailRecordingAutoEnded(data);
        }
        if (email_type === 'INVOICE_OPENED') {
            return await this.generateEmailInvoiceOpened(data);
        }
        if (email_type === 'INVOICE_DUE') {
            return await this.generateEmailInvoiceDue(data);
        }
    }

    private async deepSendEmail(email: Email) {

        if (typeof email.data === 'string') {
            email.data = JSON.parse(email.data);
        }

        if (!this.ready) {
            console.log('Email transporter not ready for', email.ID);
            return;
        }

        this.transporter.sendMail(
            {
                from: process.env.MAIL_APP_MAIL,
                to: (email.data as any).email,
                subject: email.subject,
                html: email.html,
                text: email.text,
            },
            function (error, info) {
                if (error) {
                    console.log(error);
                    return;
                } else {
                    console.log('Email sent: ' + info);
                    email.sent_at = Date.now();
                    email.status = 'SENT';
                    database.get<Email>('emails').update({ ID: email.ID }, email);
                }
            }
        );
    }

    generateEmailVerification(data: DataType<'VERIFICATION'> & { email: string; }) {
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

    generateEmailDiscount(data: DataType<'DISCOUNT'> & { email: string; }) {
        const { email, discountCode, discountAmount, expiryDate } = data;

        const html = `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Special Discount Offer</title>
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
                <h1>Special Discount Offer</h1>
              </div>
              <div class="email-body">
                <p>Hello ${email},</p>
                <p>We're excited to offer you a special discount on your TwitchStreamRecorder subscription!</p>
                
                <div style="text-align: center;">
                  <h2>Save ${discountAmount}% on your next payment</h2>
                  <h3 class="code">${discountCode}</h3>
                  <p>Use the code above at checkout or when renewing your subscription</p>
                </div>
                
                <p>This exclusive offer expires on ${new Date(expiryDate).toLocaleString('de')}, so don't miss out!</p>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="#" class="button">Redeem Now</a>
                </div>
                
                <p>Thank you for being a valued user of our service.</p>
                
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
          
          We're excited to offer you a special discount on your TwitchStreamRecorder subscription!
          
          Save ${discountAmount}% on your next payment with code: ${discountCode}
          
          This exclusive offer expires on ${new Date(expiryDate).toLocaleString('de')}, so don't miss out!
          
          To redeem, visit our website and enter the code at checkout or when renewing your subscription.
          
          Thank you for being a valued user of our service.
          
          Best regards,
          The TwitchStreamRecorder App
        `;

        return { subject: `${discountAmount}% Off Your TwitchStreamRecorder Subscription`, html, text };
    }

    generateEmailVideoAboutToBeDeleted(data: DataType<'VIDEO_ABT_DELETED'> & { email: string; }) {
        const { email, videoName, deleteDate, } = data;

        const html = `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Video Deletion Notice</title>
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
              .warning {
                background-color: #fee2e2;
                border-left: 4px solid #ef4444;
                padding: 10px 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .video-info {
                background-color: #f1f5f9;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <h1>Video Deletion Notice</h1>
              </div>
              <div class="email-body">
                <p>Hello ${email},</p>
                <p>This is a notification that one of your recorded videos will be automatically deleted soon.</p>
                
                <div class="video-info">
                  <h3>Video: ${videoName}</h3>
                  <p><strong>Will be deleted on:</strong> ${new Date(deleteDate).toLocaleString('de')}</p>
                </div>
                
                <div class="warning">
                  <p><strong>Important:</strong> After deletion, this video cannot be recovered. If you wish to keep this content, please download it before the deletion date.</p>
                </div>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="#" class="button">Download Now</a>
                </div>
                
                <p>You can also extend the storage period by upgrading your subscription plan.</p>
                
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
          
          This is a notification that one of your recorded videos will be automatically deleted soon.
          
          Video: ${videoName}
          Will be deleted on: ${new Date(deleteDate).toLocaleString('de')}
          
          IMPORTANT: After deletion, this video cannot be recovered. If you wish to keep this content, please download it before the deletion date.
          
          To download your video, please visit our website and navigate to your recordings section.
          
          You can also extend the storage period by upgrading your subscription plan.
          
          Best regards,
          The TwitchStreamRecorder App
        `;

        return { subject: 'Important: Your Video Will Be Deleted Soon', html, text };
    }

    generateEmailRecordingAutoStarted(data: DataType<'RECORDING_AUTO_STARTED'> & { email: string; }) {
        const { email, streamerName } = data;

        const html = `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recording Started</title>
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
              .stream-info {
                background-color: #f1f5f9;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
              }
              .success {
                background-color: #dcfce7;
                border-left: 4px solid #22c55e;
                padding: 10px 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <h1>Recording Started</h1>
              </div>
              <div class="email-body">
                <p>Hello ${email},</p>
                
                <div class="success">
                  <p><strong>Good news!</strong> We've automatically started recording a stream for you.</p>
                </div>
                
                <div class="stream-info">
                  <h3>${streamerName}</h3>
                </div>
                
                <p>The recording is currently in progress and will be automatically saved to your library when the stream ends.</p>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="#" class="button">View Your Recordings</a>
                </div>
                
                <p>If you want to stop this recording before the stream ends, you can do so from your dashboard.</p>
                
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
          
          Good news! We've automatically started recording a stream for you.
          
          Stream: ${streamerName}
          
          The recording is currently in progress and will be automatically saved to your library when the stream ends.
          
          If you want to stop this recording before the stream ends, you can do so from your dashboard.
          
          Best regards,
          The TwitchStreamRecorder App
        `;

        return { subject: `Recording Started From: ${streamerName}`, html, text };
    }

    generateEmailRecordingAutoEnded(data: DataType<'RECORDING_AUTO_ENDED'> & { email: string; }) {
        const { email, streamerName } = data;

        const html = `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recording Completed</title>
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
              .recording-info {
                background-color: #f1f5f9;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
              }
              .success {
                background-color: #dcfce7;
                border-left: 4px solid #22c55e;
                padding: 10px 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .button-row {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin: 25px 0;
              }
              .secondary-button {
                display: inline-block;
                background-color: #ffffff;
                color: #4f46e5;
                border: 1px solid #4f46e5;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 4px;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <h1>Recording Completed</h1>
              </div>
              <div class="email-body">
                <p>Hello ${email},</p>
                
                <div class="success">
                  <p><strong>Great news!</strong> Your stream recording is complete and ready to watch.</p>
                </div>
                
                <div class="recording-info">
                  <h3>${streamerName}</h3>
                </div>
                
                <p>Your recording has been processed and is now available in your library. You can watch, download, or share it right away.</p>
                
                <div class="button-row">
                  <a href="#" class="button">View Recordings</a>
                </div>
                
                <p>Remember that this recording will be stored according to your current subscription plan. Check your storage limits in your account settings.</p>
                
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
          
          Great news! Your stream recording is complete and ready to watch.
          
          Stream: ${streamerName}
          
          Your recording has been processed and is now available in your library. You can watch, download, or share it right away.
          
          To access your recording, please visit our website and navigate to your recordings section.
          
          Remember that this recording will be stored according to your current subscription plan. Check your storage limits in your account settings.
          
          Best regards,
          The TwitchStreamRecorder App
        `;

        return { subject: `Recording Complete From: ${streamerName}`, html, text };
    }

    async generateEmailInvoiceOpened(data: DataType<'INVOICE_OPENED'> & { email: string; }) {
        const { email, invoiceID } = data;

        const invoice = await database.get<DatabaseInvoice>('invoices').getOne({ ID: invoiceID });

        const invoiceNumber = invoice.ID.split('-')[0];
        const dueDate = new Date(invoice.createdAt + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('de');
        const subscriptionPlan = invoice.action.split(':')[1];
        const amount = invoice.amount;
        const html = `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Invoice</title>
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
              .invoice-info {
                background-color: #f1f5f9;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
              }
              .amount {
                font-size: 24px;
                font-weight: bold;
                color: #4f46e5;
                margin: 10px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              table th, table td {
                padding: 10px;
                text-align: left;
                border-bottom: 1px solid #e0e0e0;
              }
              table th {
                background-color: #f1f5f9;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <h1>New Invoice</h1>
              </div>
              <div class="email-body">
                <p>Hello ${email},</p>
                
                <p>Your invoice for TwitchStreamRecorder services is now available.</p>
                
                <div class="invoice-info">
                  <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                  <p><strong>Due Date:</strong> ${dueDate}</p>
                  <p><strong>Plan:</strong> ${subscriptionPlan}</p>
                  <div class="amount">${amount}€</div>
                </div>
                
                <table>
                  <tr>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                  <tr>
                    <td>${subscriptionPlan} Plan - Monthly Subscription</td>
                    <td>$${amount}</td>
                  </tr>
                </table>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="#" class="button">View & Pay Invoice</a>
                </div>
                
                <p>Please ensure payment is made by the due date to avoid any interruption to your service.</p>
                
                <p>Thank you for choosing TwitchStreamRecorder for your recording needs.</p>
                
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
          Your invoice for TwitchStreamRecorder services is now available.
          
          #${invoiceNumber}

          Due Date: ${dueDate}
          Plan: ${subscriptionPlan}
          Amount: ${amount}€

          Please ensure payment is made by the due date to avoid any interruption to your service.
          Thank you for choosing TwitchStreamRecorder for your recording needs.
          Best regards,
          The TwitchStreamRecorder App
          `;

        return { subject: `Invoice #${invoiceNumber} Created`, html, text };
    }

    async generateEmailInvoiceDue(data: DataType<'INVOICE_DUE'> & { email: string; }) {
        const { email, invoiceID } = data;

        const invoice = await database.get<DatabaseInvoice>('invoices').getOne({ ID: invoiceID });

        const invoiceNumber = invoice.ID.split('-')[0];
        const dueDate = new Date(invoice.createdAt + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('de');
        const subscriptionPlan = invoice.action.split(':')[1];
        const amount = invoice.amount;

        const html = `<!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice Payment Reminder</title>
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
              .invoice-info {
                background-color: #f1f5f9;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
              }
              .amount {
                font-size: 24px;
                font-weight: bold;
                color: #4f46e5;
                margin: 10px 0;
              }
              .warning {
                background-color: #fee2e2;
                border-left: 4px solid #ef4444;
                padding: 10px 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-header">
                <h1>Invoice Payment Reminder</h1>
              </div>
              <div class="email-body">
                <p>Hello ${email},</p>
                
                <div class="warning">
                  <p><strong>Important Notice:</strong> Your invoice is Due.</p>
                </div>
                
                <p>This is a friendly reminder that payment for your TwitchStreamRecorder subscription is Due.</p>
                
                <div class="invoice-info">
                  <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
                  <p><strong>Due Date:</strong> ${dueDate}</p>
                  <div class="amount">${amount}€</div>
                </div>
                
                <p>To ensure uninterrupted service and access to your recorded content, please make payment as soon as possible.</p>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="#" class="button">Pay Now</a>
                </div>
                
                <p>If you've already made a payment, please disregard this reminder. If you're experiencing any issues with payment or have questions about your invoice, please contact our support team.</p>
                
                <p>Thank you for your prompt attention to this matter.</p>
                
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
          
          Important Notice: Your invoice is Due.
          
          This is a friendly reminder that payment for your TwitchStreamRecorder subscription is Due.
          
          Invoice Number: ${invoiceNumber}
          Due Date: ${dueDate}
          Amount: ${amount}€
          
          To ensure uninterrupted service and access to your recorded content, please make payment as soon as possible.
          
          To pay your invoice, please visit our website and navigate to your billing section.
          
          If you've already made a payment, please disregard this reminder. If you're experiencing any issues with payment or have questions about your invoice, please contact our support team.
          
          Thank you for your prompt attention to this matter.
          
          Best regards,
          The TwitchStreamRecorder App
        `;
        return { subject: `Invoice #${invoiceNumber} Due`, html, text };
    };

}
