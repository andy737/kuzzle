var
  should = require('should'),
  rewire = require('rewire'),
  q = require('q'),
  methods = rewire('../../../../lib/api/dsl/methods');

describe('Test: dsl.should method', function () {
  before(function () {
    methods.__set__('getFormattedFilters', function (roomId) {
      if (roomId === 'resolve') {
        return q('resolved');
      }
      else {
        return q.reject(new Error('rejected'));
      }
    });
  });

  it('should call the function "AND" in case of a should-not filter', function () {
    var andIsCalled = false;
    methods.and = function () {
      andIsCalled = true;
    };

    methods.should('roomId', 'index', {}, {}, true);
    should(andIsCalled).be.exactly(true);
  });

  it('should call the function "OR" in case of a should filter', function () {
    var orIsCalled = false;
    methods.or = function () {
      orIsCalled = true;
    };

    methods.should('roomId', 'index', {}, {}, false);
    should(orIsCalled).be.exactly(true);
  });
});
