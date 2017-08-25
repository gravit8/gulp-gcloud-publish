/** Test dependencies */
const File = require('vinyl');
const assert = require('assert');
const _ = require('lodash');
const rewire = require('rewire');
const sinon = require('sinon');
const through = require('through2');
const from = require('from2');

describe('gulp-gcloud-publish', function suite() {
  /** Tested module */
  const gcloud = rewire('../src');

  /** Mock Gcloud */
  const storageStub = sinon.stub();
  const bucketStub = sinon.stub();
  const fileStub = sinon.stub();
  const createWriteStreamStub = sinon.stub();

  const gcloudMock = storageStub;

  storageStub.returns({ bucket: bucketStub });
  bucketStub.returns({ file: fileStub });
  fileStub.returns({
    createWriteStream: createWriteStreamStub,
  });

  function createFakeStream() {
    return through(function throughStream(chunk, enc, next) {
      this.push(chunk);
      next();
    });
  }

  gcloud.__set__('gcloud', gcloudMock);

  const exampleConfig = {
    bucket: 'something',
    projectId: 'some-id',
    keyFilename: '/path/to/something.json',
  };

  it('should throw an error when missing configuration object', function test() {
    assert.throws(() => gcloud(), /Missing configuration object/);
  });

  it('should throw an error when missing required parameters', function test() {
    function callWith(options) {
      return () => gcloud(options);
    }

    // missing projectId
    assert.throws(callWith({
      bucket: true,
      keyFilename: true,
    }), /projectId must be specified/);

    // missing keyFilename
    assert.throws(callWith({
      bucket: true,
      projectId: true,
    }), /credentials must be specified/);

    // missing bucket
    assert.throws(callWith({
      projectId: true,
      keyFilename: true,
    }), /Bucket name must be specified via `bucket`/);
  });

  it('should set the correct metadata', function test(done) {
    createWriteStreamStub.returns(createFakeStream());
    const fakeFile = new File({
      contents: from(['stream', 'with', 'those', 'contents']),
      cwd: '/',
      base: '/test/',
      path: '/test/file.css',
    });

    const task = gcloud(exampleConfig);

    task.write(fakeFile);
    task.on('data', () => {
      assert(createWriteStreamStub.calledOnce);
      const metadata = createWriteStreamStub.args[0][0].metadata;
      assert.deepEqual(metadata, {
        contentType: 'text/css',
      });

      done();
    })
      .on('error', done);
  });

  it('should recognise a gzip and make it public', function test(done) {
    createWriteStreamStub.returns(createFakeStream());
    const fakeFile = new File({
      contents: from(['stream', 'with', 'those', 'contents']),
      cwd: '/',
      base: '/test/',
      path: '/test/file.css.gz',
    });

    fakeFile.contentEncoding = ['gzip'];

    const config = _.clone(exampleConfig);
    config.public = true;

    const task = gcloud(config);

    task.write(fakeFile);
    task
      .on('data', (file) => {
        const metadata = createWriteStreamStub.args[1][0].metadata;
        assert.deepEqual(metadata, {
          contentType: 'text/css',
          contentEncoding: 'gzip',
        });

        assert.ifError(/\.gz$/.test(file.path));
        done();
      })
      .on('error', done);
  });

  it('should be called with a bucket home path', function test(done) {
    createWriteStreamStub.returns(createFakeStream());
    const fakeFile = new File({
      contents: from(['stream', 'with', 'those', 'contents']),
      cwd: '/',
      base: '/test/',
      path: '/test/file.css',
    });

    const task = gcloud(exampleConfig);

    task.write(fakeFile);
    task
      .on('data', () => {
        assert(fileStub.lastCall.calledWith('file.css'));
        done();
      })
      .on('error', done);
  });

  it('should use the correct path when starting with a /', function test(done) {
    createWriteStreamStub.returns(createFakeStream());
    const fakeFile = new File({
      contents: from(['stream', 'with', 'those', 'contents']),
      cwd: '/',
      base: '/test/',
      path: '/test/file.css',
    });

    const config = _.clone(exampleConfig);
    config.base = '/test';
    const task = gcloud(config);

    task.write(fakeFile);
    task
      .on('data', () => {
        assert(fileStub.lastCall.calledWith('test/file.css'));
        done();
      })
      .on('error', done);
  });

  it('should use the correct path when ending with a /', function test(done) {
    createWriteStreamStub.returns(createFakeStream());
    const fakeFile = new File({
      contents: from(['stream', 'with', 'those', 'contents']),
      cwd: '/',
      base: '/test/',
      path: '/test/file.css',
    });

    const config = _.clone(exampleConfig);
    config.base = 'test/';
    const task = gcloud(config);

    task.write(fakeFile);
    task
      .on('data', () => {
        assert(fileStub.lastCall.calledWith('test/file.css'));
        done();
      })
      .on('error', done);
  });

  it('should use the correct path when starting and ending with a /', function test(done) {
    createWriteStreamStub.returns(createFakeStream());
    const fakeFile = new File({
      contents: from(['stream', 'with', 'those', 'contents']),
      cwd: '/',
      base: '/test/',
      path: '/test/file.css',
    });

    const config = _.clone(exampleConfig);
    config.base = '/test';
    const task = gcloud(config);

    task.write(fakeFile);
    task
      .on('data', () => {
        assert(fileStub.lastCall.calledWith('test/file.css'));
        done();
      })
      .on('error', done);
  });
});
