module.exports = function addSubscriber(self, params) {
  if (self.subscribers === undefined) {
    self.subscribers = [];
  }
  const subscriberEndpoint = params.subscriberEndpoint;
  let unique = true;
  for (const subscriber of self.subscribers) {
    if (subscriber === subscriberEndpoint) {
      unique = false;
    }
  }
  if (unique) {
    self.subscribers.push(subscriberEndpoint);
  }
  return self.getBot();
};
