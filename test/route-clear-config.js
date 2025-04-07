import assert from 'node:assert';
import * as td from 'testdouble';
import sinon from 'sinon';
import _ from 'lodash';
import inquirer from 'inquirer';
import Router from '../lib/router.js';

describe('clear config route', () => {
  beforeEach(async function () {
    this.sandbox = sinon.createSandbox();
    this.globalConfig = {
      remove: sinon.stub(),
      removeAll: sinon.stub(),
      getAll() {
        return {
          'generator-phoenix': {},
          'generator-unicorn': {},
        };
      },
    };
    const config = {
      get() {
        return {
          unicorn: 20,
          phoenix: 10,
        };
      },
    };
    this.homeRoute = sinon.stub().returns(Promise.resolve());
    this.router = new Router(sinon.stub(), config);
    this.router.registerRoute('home', this.homeRoute);
    await td.replaceEsm('../lib/utils/global-config.js', undefined, this.globalConfig);

    const {clearConfig} = (await import('../lib/routes/clear-config.js'));

    this.router.registerRoute('clearConfig', clearConfig);
    this.router.generators = {
      'generator-unicorn': {
        name: 'generator-unicorn',
        prettyName: 'Unicorn',
        namespace: 'unicorn:app',
      },
      'generator-foo': {
        name: 'generator-foo',
        prettyName: 'Foo',
        namespace: 'foo:app',
      },
    };
  });

  afterEach(function () {
    this.sandbox.restore();
    td.reset();
  });

  it('allow returning home', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: 'home'}));
    return this.router.navigate('clearConfig').then(() => {
      sinon.assert.calledOnce(this.homeRoute);
    });
  });

  it('allows clearing a generator and return user to home screen', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: 'foo'}));
    return this.router.navigate('clearConfig').then(() => {
      sinon.assert.calledOnce(this.globalConfig.remove);
      sinon.assert.calledWith(this.globalConfig.remove, 'foo');
      sinon.assert.calledOnce(this.homeRoute);
    });
  });

  it('allows clearing all generators and return user to home screen', function () {
    this.sandbox.stub(inquirer, 'prompt').returns(Promise.resolve({whatNext: '*'}));
    return this.router.navigate('clearConfig').then(() => {
      sinon.assert.calledOnce(this.globalConfig.removeAll);
      sinon.assert.calledOnce(this.homeRoute);
    });
  });

  it('shows generator with global config entry', function () {
    let choices = [];

    this.sandbox.stub(inquirer, 'prompt').callsFake(argument => {
      ({choices} = argument[0]);
      return Promise.resolve({whatNext: 'foo'});
    });
    return this.router.navigate('clearConfig').then(() => {
      // Clear all generators entry is present
      assert.ok(_.find(choices, {value: '*'}));

      assert.ok(_.find(choices, {value: 'generator-unicorn'}));
      assert.ok(_.find(choices, {value: 'generator-phoenix'}));
      assert.ok(_.find(choices, {name: 'Unicorn'}));
      assert.ok(
        _.find(choices, {name: 'phoenix\u001B[31m (not installed anymore)\u001B[39m'})
        || _.find(choices, {name: 'phoenix (not installed anymore)'}),
      );
    });
  });
});
