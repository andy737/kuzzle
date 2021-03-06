var
  should = require('should'),
  operators = require.main.require('lib/api/dsl/operators');

describe('Test term operator', function () {

  var document = {
    title: 'kuzzle'
  };

  it('should return true when the document field value match', function () {
    var result = operators.term('title', 'kuzzle', document);
    should(result).be.exactly(true);
  });

  it('should return false when the document field value doesn\'t match', function () {
    var result = operators.term('title', 'foobar', document);
    should(result).be.exactly(false);
  });

  it('should return false if the searched value doesn\'t exist in the document', function () {
    should(operators.term('foo', 'kuzzle', document)).be.false();
  });
});