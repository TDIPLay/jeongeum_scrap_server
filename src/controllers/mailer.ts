import nodemailer, {Transporter} from 'nodemailer';
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

class EmailSender {
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

    public async sendEmail(options: MailOptions): Promise<void> {
        await this.transporter.sendMail(options, (err, info) => {
            if (err) {
                console.error('Send Mail error : ', err);
            } else {
                console.log('Message sent : ', info);
            }
        });
    }
}

export async function sendMail(user: string, news: News[], query: string) {
    const content = generateHTML(news);

    await new EmailSender({
        user: process.env.GOOGLE_MAIL_ID,
        pass: process.env.GOOGLE_MAIL_PW,
    }).sendEmail({
        from: process.env.GOOGLE_MAIL_ID,
        to: user,
        subject: `[정음]오늘의 뉴스(#${query})`,
        html: content,
    });
}

export async function sendBriefingMail(user: string, title: string,content: string) {

    await new EmailSender({
        user: process.env.GOOGLE_MAIL_ID,
        pass: process.env.GOOGLE_MAIL_PW,
    }).sendEmail({
        from: process.env.GOOGLE_MAIL_ID,
        to: user,
        subject: `${title}`,
        html: content,
    });
}


function generateHTML(data: News[]): string {
    const template = data.map((item) => {
        const title = item.title ? item.title.replace(/"/g, "`") : "";
        const description = item.description ? item.description.replace(/"/g, "`") : "";
        const company = item.company ? item.company.replace(/"/g, "`") : "";

        return `
        <div style="margin-bottom: 10px;">
          <a href="${item.link}" style="text-decoration: none;">
            <img src="${item.thumbnail}" alt="${title}" style="float: left; margin-right: 10px; width: 70px; height: 70px;"/>
            <div style="overflow: hidden;">
              <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">
                ${title}
              </div>
              <div style="font-size: 12px; color: #757575;">
                ${company} | ${item.pubDate}
              </div>
              <div style="font-size: 12px; margin-top: 5px; color: #757575;">
                ${description}
              </div>
            </div>
          </a>
        </div>
      `;
    }).join("");

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
