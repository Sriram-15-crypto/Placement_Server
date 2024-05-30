const sgMail = require("@sendgrid/mail");
require("dotenv").config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (receiverEmail, emailSubject, emailBody) => {
  try {
    const msg = {
      to: receiverEmail,
      from: process.env.FORM_EMAIL,
      subject: emailSubject,
      html: emailBody,
    };

    await sgMail.send(msg);
    console.log("Email sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending email:", error);

    if (error.response) {
      console.error(error.response.body);
    }

    return false;
  }
};

module.exports = { sendEmail };