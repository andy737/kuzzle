var apiSteps = function () {
  this.When(/^I publish a message$/, function (callback) {
    this.api.publish(this.documentGrace)
      .then(function (body) {
        if (body.error) {
          callback(new Error(body.error.message));
          return false;
        }

        if (!body.result) {
          callback(new Error('No result provided'));
          return false;
        }

        this.result = body;
        callback();
      }.bind(this))
      .catch(function (error) {
        callback(error);
      });
  });

  this.Then(/^I should receive a request id$/, function (callback) {
    if (this.result && this.result.requestId) {
      callback();
      return false;
    }

    callback(new Error('No request id returned'));
  });
};

module.exports = apiSteps;
