import nodemailer, { Transporter } from 'nodemailer';
import {News} from "../interfaces";

interface MailOptions {
    from: string;
    to: string;
    subject: string;
    html: string;
}

interface EmailConfig {
    user: string;
    pass: string;
}

export class EmailSender {
    private readonly transporter: Transporter;

    constructor(emailConfig: EmailConfig) {
        this.transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: emailConfig.user,
                pass: emailConfig.pass,
            },
        });
    }

    public sendEmail(mailOptions: MailOptions): void {
        this.transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('Send Mail error : ', err);
            } else {
                console.log('Message sent : ', info);
            }
        });
    }
}





export function generateHTML(data: News[]): string {
    const template = data.map(
        (item) => `
      <div style="margin-bottom: 10px;">
        <a href="${item.link}" style="text-decoration: none;">
          <img src="${item.thumbnail}" alt="${item.title}" style="float: left; margin-right: 10px; width: 70px; height: 70px;">
          <div style="overflow: hidden;">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">${item.title}</div>
            <div style="font-size: 12px; color: #757575;">${item.company} | ${item.pubDate}</div>
            <div style="font-size: 12px; margin-top: 5px; color: #757575;">${item.description}</div>
          </div>
        </a>
      </div>
    `
    ).join("");

    return `
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body>
        <h1>오늘의 뉴스</h1>
        ${template}
      </body>
    </html>
  `;
}
