const nodemailer = require("nodemailer");

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.firstName;
    this.url = url;
    this.from = `Your Company <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    // Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      text: `مهرباني وکړئ د خپل پاسورډ د بیرته تنظیمولو لپاره په لاندې لینک کلیک وکړئ: ${this.url}`,
    };

    // Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "ستاسو د پاسورډ بیرته تنظیمولو ټوکن (یوازې د 10 دقیقو لپاره اعتبار لري)",
    );
  }
}

module.exports = Email;
