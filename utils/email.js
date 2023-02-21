const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  //1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_PASSWORD || process.env.HOST,
    port: process.env.EMAIL_PORT,

    auth: {
      user: process.env.EMAIL_USERNAME,
      password: process.env.EMAIL_PASSWORD,
    },
  });

  //2) Define the email options
  const mailOptions = {
    from: "Ikechi Greatness <ikechigreat@gmail.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: options
  };
  //3) Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
