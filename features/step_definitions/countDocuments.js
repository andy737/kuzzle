var
  async = require('async');

var apiSteps = function () {
  this.Then(/^I count ([\d]*) documents(?: in index "([^"]*)")?$/, function (number, index, callback) {
    var main = function (callbackAsync) {
      setTimeout(function () {
        this.api.count({}, index)
          .then(function (body) {
            if (body.error) {
              callbackAsync(body.error.message);
              return false;
            }

            if (body.result.count !== parseInt(number)) {
              callbackAsync('No correct value for count. Expected ' + number + ', got ' + body.result.count);
              return false;
            }

            callbackAsync();
          }.bind(this))
          .catch(function (error) {
            callbackAsync(error);
          });
      }.bind(this), 100); // end setTimeout
    };

    async.retry(20, main.bind(this), function (err) {
      if (err) {
        if (err.message) {
          err = err.message;
        }

        callback(new Error(err));
        return false;
      }

      callback();
    });
  });

  this.Then(/^I count ([\d]*) documents with "([^"]*)" in field "([^"]*)(?: in index "([^"]*)")?"/, function (number, value, field, index, callback) {
    var main = function (callbackAsync) {
      setTimeout(function () {
        var filter = {
          query: {
            match: {}
          }
        };

        filter.query.match[field] = value;

        this.api.count(filter, index)
          .then(function (body) {
            if (body.error) {
              callbackAsync(body.error.message);
              return false;
            }

            if (body.result.count !== parseInt(number)) {
              callbackAsync('Wrong document count received. Expected ' + number + ', got ' + body.result.count);
              return false;
            }

            callbackAsync();
          }.bind(this))
          .catch(function (error) {
            callbackAsync(new Error(error));
          });
      }.bind(this), 20);
    };

    async.retry(20, main.bind(this), function (error) {
      if (error) {
        callback(new Error(error));
        return false;
      }

      callback();
    });
  });

};

module.exports = apiSteps;
