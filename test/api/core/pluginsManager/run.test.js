var
  should = require('should'),
  params = require('rc')('kuzzle'),
  rewire = require('rewire'),
  sinon = require('sinon'),
  PluginsManager = rewire('../../../../lib/api/core/plugins/pluginsManager'),
  EventEmitter = require('eventemitter2').EventEmitter2,
  GatewayTimeoutError = require.main.require('kuzzle-common-objects').Errors.gatewayTimeoutError,
  workerPrefix = PluginsManager.__get__('workerPrefix');

describe('Test plugins manager run', function () {
  var
    sandbox,
    plugin,
    pluginMock,
    kuzzle,
    pluginsManager,
    pm2Mock;

  before(function () {
    pm2Mock = function () {
      /* jshint -W106 */
      var universalProcess = {
        name: workerPrefix + 'testPlugin',
        pm_id: 42
      };
      /* jshint +W106 */
      var busData = {
        'initialized': {
          process: universalProcess,
          data: {
            events: [
              'foo:bar'
            ]
          }
        },
        'process:event': {
          event: 'exit',
          process: universalProcess
        },
        'ready': {
          process: universalProcess
        }
      };
      var
        busListeners,
        processList,
        uniqueness,
        sentMessages;

      return {
        connect: function (callback) {
          callback();
        },
        list: function (callback) {
          callback(null, processList.map(item => item.process));
        },
        delete: function (pmId, callback) {
          processList = processList.filter(item => {
            /* jshint -W106 */
            return item.process.pm_id !== pmId;
            /* jshint +W106 */
          });
          callback(null);
        },
        start: function (processSpec, callback) {
          var i;
          for(i = 0; i < processSpec.instances; i++) {
            /* jshint -W106 */
            processList.push({
              process: {
                name: processSpec.name,
                pm_id: uniqueness++
              }
            });
            /* jshint +W106 */
          }
          callback();
        },
        launchBus: function (callback) {
          callback(null, {
            on: function (event, cb) {
              var wrapper = function (data) {
                cb(data);
              };
              if (!busListeners[event]) {
                busListeners[event] = [];
              }
              busListeners[event].push(wrapper);
            }
          });
        },
        sendDataToProcessId: function (processId, data, callback) {
          sentMessages.push(data);
          callback(null);
        },
        /** Mock only methods */
        resetMock: function () {
          busListeners = {};
          processList = [];
          uniqueness = 0;
          sentMessages = [];
        },
        getProcessList: function () {
          return processList;
        },
        getSentMessages: function() {
          return sentMessages;
        },
        // Should be used to trigger a particular event on the bus
        triggerOnBus: function (event) {
          if (busListeners[event]) {
            busListeners[event].forEach(item => {
              item(busData[event]);
            });
          }
        },
        initializeList: function () {
          processList = [{process: universalProcess}];
        }
        /** END - Mock only methods */
      };
    }();

    PluginsManager.__set__('console', {
      log: function () {},
      error: function () {}
    });

    PluginsManager.__set__('pm2', pm2Mock);
  });

  beforeEach(() => {
    kuzzle = new EventEmitter({
      wildcard: true,
      maxListeners: 30,
      delimiter: ':'
    });
    kuzzle.config = { pluginsManager: params.pluginsManager };

    pluginsManager = new PluginsManager(kuzzle);
    pm2Mock.resetMock();
    sandbox = sinon.sandbox.create();

    plugin = {
      object: {
        init: function () {}
      },
      config: {},
      activated: true
    };

    pluginMock = sandbox.mock(plugin.object);
    pluginsManager.plugins = {testPlugin: plugin};
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should do nothing on run if plugin is not activated', () => {
    plugin.activated = false;
    pluginMock.expects('init').never();

    return pluginsManager.run()
      .then(() => pluginMock.verify());
  });

  it('should attach event hook on kuzzle object', () => {
    plugin.object.hooks = {
      'foo:bar': 'foo',
      'bar:foo': 'bar'
    };

    plugin.object.foo = function () {};
    plugin.object.bar = function () {};

    pluginMock.expects('foo').once();
    pluginMock.expects('bar').never();

    return pluginsManager.run()
      .then(() => {
        kuzzle.emit('foo:bar');
        pluginMock.verify();
      });
  });

  it('should attach multi-target hook on kuzzle object', () => {
    plugin.object.hooks = {
      'foo:bar': ['foo', 'bar'],
      'bar:foo': ['baz']
    };

    plugin.object.foo = function () {};
    plugin.object.bar = function () {};
    plugin.object.baz = function () {};

    pluginMock.expects('foo').once();
    pluginMock.expects('bar').once();
    pluginMock.expects('baz').never();

    return pluginsManager.run()
      .then(() => {
        kuzzle.emit('foo:bar');
        pluginMock.verify();
      });
  });

  it('should attach event hook with wildcard on kuzzle object', () => {
    plugin.object.hooks = {
      'foo:*': 'foo',
      'bar:foo': 'bar'
    };

    plugin.object.foo = function () {};
    plugin.object.bar = function () {};

    pluginMock.expects('foo').once();
    pluginMock.expects('bar').never();

    return pluginsManager.run()
      .then(() => {
        kuzzle.emit('foo:bar');
        pluginMock.verify();
      });
  });

  it('should attach pipes event', () => {
    plugin.object.pipes = {
      'foo:bar': 'foo',
      'bar:foo': 'bar'
    };

    plugin.object.foo = function () {};
    plugin.object.bar = function () {};

    pluginMock.expects('foo').once().callsArg(1);
    pluginMock.expects('bar').never().callsArg(1);

    return pluginsManager.run()
      .then(() => pluginsManager.trigger('foo:bar'))
      .then(() => pluginMock.verify());
  });

  it('should attach pipes event with wildcard', () => {
    plugin.object.pipes = {
      'foo:*': 'foo',
      'bar:foo': 'bar'
    };

    plugin.object.foo = function () {};
    plugin.object.bar = function () {};

    pluginMock.expects('foo').once().callsArg(1);
    pluginMock.expects('bar').never().callsArg(1);

    return pluginsManager.run()
      .then(() => pluginsManager.trigger('foo:bar'))
      .then(() => pluginMock.verify());
  });

  it('should attach multi-function event to pipes', () => {
    plugin.object.pipes = {
      'foo:bar': ['foo', 'baz'],
      'bar:foo': 'bar'
    };

    plugin.object.foo = function () {};
    plugin.object.bar = function () {};
    plugin.object.baz = function () {};

    pluginMock.expects('foo').once().callsArg(1);
    pluginMock.expects('bar').never().callsArg(1);
    pluginMock.expects('baz').once().callsArg(1);

    return pluginsManager.run()
      .then(() => pluginsManager.trigger('foo:bar'))
      .then(() => pluginMock.verify());
  });

  it('should attach pipes event and reject if an attached function return an error', () => {
    plugin.object.pipes = {
      'foo:bar': 'foo'
    };

    plugin.object.foo = function () {};

    pluginMock.expects('foo').once().callsArgWith(1, new Error('foobar'));

    return should(pluginsManager.run()
      .then(() => pluginsManager.trigger('foo:bar'))
      .then(() => pluginMock.verify())).be.rejectedWith(Error, {message: 'foobar'});
  });

  it('should log a warning in case a pipe plugin exceeds the warning delay', () => {
    var
      spy = sandbox.spy(kuzzle, 'emit'),
      fooStub;

    plugin.object.pipes = {
      'foo:bar': 'foo'
    };

    plugin.object.foo = function () {};
    fooStub = sandbox.stub(plugin.object, 'foo', function (ev, cb) {
      setTimeout(() => cb(), 50);
    });

    return pluginsManager.run()
      .then(() => pluginsManager.trigger('foo:bar'))
      .then(() => {
        should(fooStub.calledOnce).be.true();
        should(spy.calledWithMatch('log:warn', /Pipe .*? exceeded [0-9]*ms to execute\./)).be.true();
      });
  });

  it('should timeout the pipe when taking too long to execute', () => {
    plugin.object.pipes = {
      'foo:bar': 'foo'
    };

    plugin.object.foo = function () {}; // does not call the callback

    return should(pluginsManager.run()
      .then(() => pluginsManager.trigger('foo:bar'))).be.rejectedWith(GatewayTimeoutError);
  });

  it('should attach controller actions on kuzzle object', () => {
    plugin.object.controllers = {
      'foo': 'FooController'
    };

    plugin.object.FooController = function () {};
    pluginMock.expects('FooController').once().calledOn(plugin.object);

    return pluginsManager.run()
      .then(() => {
        should.not.exist(pluginsManager.controllers['testPlugin/dfoo']);
        should(pluginsManager.controllers['testPlugin/foo']).be.a.Function();
        pluginsManager.controllers['testPlugin/foo']();
        pluginMock.verify();
      });
  });

  it('should attach controller routes on kuzzle object', () => {
    plugin.object.routes = [
      {verb: 'get', url: '/bar/:name', controller: 'foo', action: 'bar'},
      {verb: 'post', url: '/bar', controller: 'foo', action: 'bar'}
    ];

    plugin.object.controllers = ['foo'];

    return pluginsManager.run()
      .then(() => {
        should(pluginsManager.routes).be.an.Array().and.length(2);
        should(pluginsManager.routes[0].verb).be.equal('get');
        should(pluginsManager.routes[0].url).be.equal('/testPlugin/bar/:name');
        should(pluginsManager.routes[1].verb).be.equal('post');
        should(pluginsManager.routes[1].url).be.equal('/testPlugin/bar');
        should(pluginsManager.routes[0].controller)
          .be.equal(pluginsManager.routes[0].controller)
          .and.be.equal('testPlugin/foo');
        should(pluginsManager.routes[0].action)
          .be.equal(pluginsManager.routes[0].action)
          .and.be.equal('bar');
      });
  });

  it('should initialize plugin workers if some are defined', () => {
    plugin.config.threads = 2;
    pluginsManager.isServer = true;
    pluginsManager.isDummy = false;

    return pluginsManager.run()
      .then(() => should(pm2Mock.getProcessList()).be.an.Array().and.length(2));
  });

  it('should send an initialize message to the process when ready is received', () => {
    plugin.config.threads = 1;
    pluginsManager.isServer = true;
    pluginsManager.isDummy = false;

    return pluginsManager.run()
      .then(() => {
        var messages;
        pm2Mock.triggerOnBus('ready');
        messages = pm2Mock.getSentMessages();
        should(messages).be.an.Array().and.length(1);
        should(messages[0].topic).be.equal('initialize');
      });
  });

  it('should add worker to list when initialized is received', () => {
    plugin.config.threads = 1;
    pluginsManager.isServer = true;
    pluginsManager.isDummy = false;

    return pluginsManager.run()
      .then(() => {
        pm2Mock.triggerOnBus('initialized');
        should(pluginsManager.workers[workerPrefix + 'testPlugin']).be.an.Object();
        should(pluginsManager.workers[workerPrefix + 'testPlugin'].pmIds).be.an.Object();
        should(pluginsManager.workers[workerPrefix + 'testPlugin'].pmIds.getSize()).be.equal(1);
      });
  });

  it('should remove a worker to list when process:event exit is received', () => {
    plugin.config.threads = 1;
    pluginsManager.isServer = true;
    pluginsManager.isDummy = false;

    return pluginsManager.run()
      .then(() => {
        pm2Mock.triggerOnBus('initialized');
        should(pluginsManager.workers[workerPrefix + 'testPlugin']).be.an.Object();
        should(pluginsManager.workers[workerPrefix + 'testPlugin'].pmIds).be.an.Object();
        should(pluginsManager.workers[workerPrefix + 'testPlugin'].pmIds.getSize()).be.equal(1);

        pm2Mock.triggerOnBus('process:event');
        should.not.exist(pluginsManager.workers[workerPrefix + 'testPlugin']);
      });
  });

  it('should receive the triggered message', () => {
    var triggerWorkers = PluginsManager.__get__('triggerWorkers');
    plugin.config.threads = 1;
    plugin.config.hooks = {
      'foo:bar': 'foobar'
    };
    pluginsManager.isServer = true;
    pluginsManager.isDummy = false;

    return pluginsManager.run()
      .then(() => {
        pm2Mock.triggerOnBus('initialized');

        should(pluginsManager.workers[workerPrefix + 'testPlugin']).be.an.Object();
        should(pluginsManager.workers[workerPrefix + 'testPlugin'].pmIds).be.an.Object();
        should(pluginsManager.workers[workerPrefix + 'testPlugin'].pmIds.getSize()).be.equal(1);

        triggerWorkers.call(pluginsManager, 'foo:bar', {
          'firstName': 'Ada'
        });

        should(pm2Mock.getSentMessages()).be.an.Array().and.length(1);
        should(pm2Mock.getSentMessages()[0]).be.an.Object();
        should(pm2Mock.getSentMessages()[0].data.message.firstName).be.equal('Ada');
      });
  });

  it('should delete plugin workers at initialization', function (done) {
    plugin.config.threads = 1;
    pluginsManager.isServer = true;
    pluginsManager.isDummy = false;

    pm2Mock.initializeList();

    pluginsManager.run()
      .then(() => {
        should(pm2Mock.getProcessList()).length(1);
        /* jshint -W106 */
        should(pm2Mock.getProcessList()[0].process.pm_id).not.equal(42);
        /* jshint +W106 */
        done();
      });
  });
});
