var
  async = require('async');

var apiSteps = function () {
  this.Then(/^I can retrieve actions from bulk import$/, function (callback) {
    var main = function (callbackAsync) {
      setTimeout(function () {
        // execute in parallel both tests: test if create/update work well and test if delete works well
        async.parallelLimit({
          testUpdate: function (callbackAsyncParallel) {
            this.api.get('1')
              .then(function (body) {
                if (body.error !== null) {
                  callbackAsyncParallel(body.error.message);
                  return false;
                }

                if (body.result && body.result._source && body.result._source.title === 'foobar') {
                  callbackAsyncParallel();
                  return false;
                }

                callbackAsyncParallel('Document was not updated or created successfully in bulk import');
              }.bind(this))
              .catch(function (error) {
                callbackAsyncParallel(error);
              });
          }.bind(this),
          testDelete: function (callbackAsyncParallel) {
            this.api.get('2')
              .then(function (body) {
                if (body.error !== null) {
                  callbackAsyncParallel();
                  return false;
                }

                if (body.result && body.result._source) {
                  callbackAsyncParallel('Document still exists');
                  return false;
                }

                callback();
              }.bind(this))
              .catch(function () {
                callbackAsyncParallel();
              });
          }.bind(this)
        }, 1, function (error) {
          // Only when we have response from async.parallelLimit we can stop retry by calling callbackAsync
          if (error) {
            callbackAsync(error);
            return false;
          }

          callbackAsync();
        }.bind(this)); // end async.parallel
      }.bind(this), 20); // end setTimeout
    }; // end method main

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

  this.When(/^I do a bulk import(?: from index "([^"]*)")?$/, function (index, callback) {
    this.api.bulkImport(this.bulk, index)
      .then(function (body) {
        if (body.error !== null) {
          callback(new Error(body.error.message));
          return false;
        }

        callback();
      }.bind(this))
      .catch(function (error) {
        callback(error);
      });
  });

  this.When(/^I do a global bulk import$/, function (callback) {
    this.api.globalBulkImport(this.globalBulk)
      .then(function (body) {
        if (body.error !== null) {
          callback(new Error(body.error.message));
          return false;
        }

        callback();
      }.bind(this))
      .catch(function (error) {
        callback(error);
      });
  });
};

module.exports = apiSteps;
