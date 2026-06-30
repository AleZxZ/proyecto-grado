const { MailtrapClient } = require('mailtrap');

const client = new MailtrapClient({
  token: process.env.MAILTRAP_API_TOKEN,
  testInboxId: Number(process.env.MAILTRAP_INBOX_ID),
  sandbox: true,
});

module.exports = client;

/*const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: Number(process.env.MAILTRAP_PORT),
  secure: false,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
  connectionTimeout: 10000,
});

module.exports = transporter;



/*
  const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

module.exports = transporter;

*/
