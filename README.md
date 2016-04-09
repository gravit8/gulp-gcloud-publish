# gulp-gcloud

Upload files to Google Cloud Storage with Gulp

## Install

```
npm install --save-dev gulp-gcloud
```

## Usage

First, you need to create your Google Cloud API credentials. [__Official Docs__][gc-docs].

The plugin takes a configuration object with the following keys:

- bucket `String`: Name of the bucket where we want to upload the file
- keyFilename `String`: Full path to the Google Cloud API keyfile ([docs][gc-docs])
- credentials `Object`: Full path to the Google Cloud API keyfile ([docs][gc-docs])
- projectId `String`: Google Cloud Project ID ([docs][gc-docs])
- base `String`: base path to use in the bucket, default to `/`
- public `Boolean` (optional): If set to true, marks the uploaded file as public
- transformPath `Function` (optional): pass function to transform upload path if base is not enough
- metadata `Object` (optional): specify extra metadata for files
- metadata.cacheControl `String` (optional): cache for 1 year, dont change assets, cache on intermidiary proxies `max-age=315360000, no-transform, public`

## Example

If you would like to `gzip` the files, the plugin works best with [gulp-gzip](https://www.npmjs.com/package/gulp-gzip).

```js
const gulp = require('gulp');
const gcPub = require('gulp-gcloud');
const gzip = require('gulp-gzip'); // optional

gulp.task('publish', function() {
  return gulp.src('public/css/example.css')
    .pipe(gzip()) // optional
    .pipe(gcPub({
      bucket: 'bucket-name',
      keyFilename: 'path/to/keyFile.json',
      projectId: 'my-project-id',
      base: '/css',
      public: true,
      metadata: {
        cacheControl: 'max-age=315360000, no-transform, public',
      },
    })); // => File will be uploaded to /bucket-name/css/example.css
});
```

[gc-docs]: https://googlecloudplatform.github.io/gcloud-node/#/authorization
