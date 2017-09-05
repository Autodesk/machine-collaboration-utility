const Twilio = require('twilio');

function validateTwilioVars() {
  let valid = false;
  const account = process.env.TWILIO_ACCOUNT;
  const auth = process.env.TWILIO_AUTH;
  const to = process.env.TWILIO_TO;
  const from = process.env.TWILIO_FROM;

  if (account && auth && to && from) {
    valid = true;
  }

  return { account, auth, to, from, valid };
}

async function sendTwilioUpdate(message) {
  const twilioSettings = validateTwilioVars();
  if (!twilioSettings.valid) {
    return;
  }

  const client = new Twilio(twilioSettings.account, twilioSettings.auth);
  const messageObject = {
    body: message,
    to: twilioSettings.to, // Text this number
    from: twilioSettings.from, // From a valid Twilio number
  };

  try {
    const reply = await client.messages.create(messageObject);
  } catch (ex) {
    logger.error('Failed to send Twilio message', message, ex);
  }
}

module.exports = sendTwilioUpdate;
