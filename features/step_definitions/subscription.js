var apiSteps = function () {
  this.Given(/^A room subscription listening to "([^"]*)" having value "([^"]*)"(?: with socket "([^"]*)")?$/, function (key, value, socketName, callback) {
    var filter = { term: {} };

    filter.term[key] = value;
    this.api.subscribe(filter, socketName)
      .then(function (body) {
        if (body.error !== null) {
          callback(new Error(body.error.message));
          return false;
        }

        callback();
      }.bind(this))
      .catch(function (error) {
        callback(new Error(error));
      });
  });

  this.Given(/^A room subscription listening to the whole collection$/, function (callback) {
    this.api.subscribe()
      .then(function (body) {
        if (body.error !== null) {
          callback(new Error(body.error.message));
          return false;
        }

        callback();
      }.bind(this))
      .catch(function (error) {
        callback(new Error(error));
      });
  });

  this.Given(/^A room subscription listening field "([^"]*)" doesn't exists$/, function (key, callback) {
    var filter = {not: {exists: {field : null}}};

    filter.not.exists.field = key;
    this.api.subscribe(filter)
      .then(function (body) {
        if (body.error !== null) {
          callback(new Error(body.error.message));
          return false;
        }

        callback();
      }.bind(this))
      .catch(function (error) {
        callback(new Error(error));
      });
  });

  this.Then(/^I unsubscribe(?: socket "([^"]*)")?/, function (socketName, callback) {
    var rooms;

    if (socketName) {
      rooms = Object.keys(this.api.subscribedRooms[socketName]);
    }
    else {
      socketName = Object.keys(this.api.subscribedRooms)[0];
      rooms = Object.keys(this.api.subscribedRooms[socketName]);
    }

    if (rooms.length === 0) {
      callback(new Error('Cannot unsubscribe: no subscribed rooms'));
      return false;
    }

    this.api.unsubscribe(rooms[rooms.length - 1], socketName)
      .then(function () {
        callback();
      })
      .catch(function (error) {
        callback(new Error(error));
      });
  });

  /**
   * Remove room subscription
   */
  this.Then(/^I remove the first room(?: for socket "([^"]*)")?/, function (socketName, callback) {
    var rooms;

    if (socketName) {
      rooms = Object.keys(this.api.subscribedRooms[socketName]);
    }
    else {
      socketName = Object.keys(this.api.subscribedRooms)[0];
      rooms = Object.keys(this.api.subscribedRooms[socketName]);
    }

    if (rooms.length === 0) {
      callback(new Error('Cannot unsubscribe: no subscribed rooms'));
      return false;
    }

    this.api.removeRooms([rooms[0]])
      .then(function () {
        callback();
      })
      .catch(function (error) {
        callback(new Error(error));
      });
  });

  this.Then(/^I can count "([^"]*)" subscription/, function (number, callback) {
    this.api.countSubscription()
      .then(function (response) {
        if (response.error) {
          callback(new Error(response.error.message));
          return false;
        }

        if (!response.result.count || response.result.count !== parseInt(number)) {
          callback(new Error('No correct value for count. Expected ' + number + ', got ' + response.result));
          return false;
        }

        callback();
      })
      .catch(function (error) {
        callback(new Error(error));
      });
  });

  this.Then(/^I get the list subscriptions$/, function (callback) {
    this.api.listSubscriptions()
      .then(response => {
        if (response.error) {
          return callback(new Error(response.error.message));
        }

        if (!response.result) {
          return callback(new Error('No result provided'));
        }

        this.result = response.result;
        callback();
      })
      .catch(error => {
        callback(error);
      });
  });

  this.Then(/^In my list there is a collection "([^"]*)" with ([\d]*) room and ([\d]*) subscriber$/, function(collection, countRooms, countSubscribers, callback) {

    if (!this.result[this.fakeIndex]) {
      return callback(new Error('No entry for index ' + this.fakeIndex));
    }

    if (!this.result[this.fakeIndex][collection]) {
      return callback(new Error('No entry for collection ' + collection));
    }

    var rooms = Object.keys(this.result[this.fakeIndex][collection]);

    if (rooms.length !== parseInt(countRooms)) {
      return callback(new Error('Wrong number rooms for collection ' + collection + '. Expected ' + countRooms + ' get ' + rooms.length));
    }

    var count = 0;

    rooms.forEach(roomId => {
      count += this.result[this.fakeIndex][collection][roomId];
    });

    if (count !== parseInt(countSubscribers)) {
      return callback(new Error('Wrong number subscribers for collection ' + collection + '. Expected ' + countSubscribers + ' get ' + count));
    }

    callback();
  });
};

module.exports = apiSteps;
