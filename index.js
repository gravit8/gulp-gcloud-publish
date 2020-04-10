'use strict';

// eslint-disable-next-line no-var
var {Storage} = require('@google-cloud/storage');
const mime = require('mime');
const omit = require('lodash.omit');
const gutil = require('gulp-util');
const assert = require('assert');
const through = require('through2');

const PLUGIN_NAME = 'gulp-gcloud-publish';
const PluginError = gutil.PluginError;

function getMetadata(file, extraMetadata = {}) {
  const meta = Object.assign({ contentType: mime.lookup(file.path) }, extraMetadata);
  if (file.contentEncoding && file.contentEncoding.indexOf('gzip') > -1) {
    meta.contentEncoding = 'gzip';
  }
  return meta;
}

function normalizePath(_base, file) {
  let base = _base;

  // ensure there is a tailing slash in the base path
  if (base && !/\/$/.test(base)) {
    base += '/';
  }

  // ensure the is no starting slash
  if (base && /^\//.test(base)) {
    base = base.replace(/^\//, '');
  }

  base = base || '';
  return base + file.relative;
}

function assertConfiguration(options) {
  try {
    assert(options, 'Missing configuration object');
    assert(options.bucket, 'Bucket name must be specified via `bucket`');
    assert(options.keyFilename || options.credentials, 'credentials must be specified');
    assert(options.projectId, 'projectId must be specified');
  } catch (e) {
    throw new PluginError(PLUGIN_NAME, e, { showStack: true });
  }
}

/**
 * Upload a file stream to Google Cloud Storage
 *
 * @param {Object}  params
 * @param {String}  params.bucket      - Name of the bucket we want to upload the file into
 * @param {String}  params.keyFilename - Full path to the KeyFile JSON
 * @param {String}  params.credentials - Object with gcloud credentials, specify either that, or keyFilename
 * @param {String}  params.projectId   - Project id
 * @param {String}  [params.base='/']  - Base path for saving the file
 * @param {Boolean} [params.public]    - Set the file as public
 * @param {String}  [params.cacheControl] - Sets cache control for a given file
 * @param {Function} [params.transformPath] - transforms file path
 */
function gPublish(params) {
  assertConfiguration(params);

  const {
    base,
    bucket: bucketName,
    public: permission,
    metadata: extraMetadata,
    transformPath
  } = params;

  const options = omit(params, ['base', 'bucket', 'public', 'metadata', 'transformPath']);
  const storage = new Storage(options);
  const bucket = storage.bucket(bucketName);
  const acls = permission ? 'publicRead' : undefined;

  return through.obj((file, enc, done) => {
    if (file.isNull() === true) {
      return done(null, file);
    }

    file.path = file.path.replace(/\.gz$/, '');
    const metadata = getMetadata(file, extraMetadata);

    // Authenticate on Google Cloud Storage
    const gcPath = transformPath ? transformPath(file) : normalizePath(base, file);
    const gcFile = bucket.file(gcPath);
    const stream = gcFile.createWriteStream({ metadata, resumable: false, acls });

    if (file.isStream()) {
      return file.pipe(stream).on('error', done).on('finish', () => {
        gutil.log('uploaded:', gutil.colors.cyan(gcPath));
        return done(null, file);
      });
    } else if (file.isBuffer()) {
      return stream.on('error', done).on('finish', () => {
        gutil.log('uploaded:', gutil.colors.cyan(gcPath));
        return done(null, file);
      }).end(file.contents);
    }
  });
}

module.exports = gPublish;
