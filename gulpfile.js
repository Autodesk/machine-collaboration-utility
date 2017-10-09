try {
  require('dotenv').config();
} catch (ex) {
  console.log('No .env file found', ex);
}

const gulp = require('gulp');
const mocha = require('gulp-mocha');
const nodemon = require('gulp-nodemon');

gulp.task('test', ['default'], () => {
  // Timeout is ugly hack to allow time for the server instance to initialize
  // TODO Get rid of timeout for running tests
  setTimeout(
    () =>
      gulp
        .src('./test.js', { read: false })
        .pipe(mocha())
        .once('error', (err) => {
          // Error could be caused by not giving enough time
          // for the server to spin up before starting tests
          console.log('Testing error:\n', err);
          process.exit(1);
        })
        .once('end', () => {
          process.exit();
        }),
    10000,
  );
});

gulp.task('develop', () => {
  // Looking to see if we are running 'npm test'
  const npmArgs = JSON.parse(process.env.npm_config_argv);
  const testArg = npmArgs.cooked && npmArgs.cooked[0];
  const nodeArgs = ['--debug'];

  const nodemonArgs = {
    script: 'server/launch.js',
    ignore: ['./uploads'],
  };

  if (testArg === 'test') {
    nodemonArgs.env = { NODE_ENV: 'test' };
  }

  return nodemon(nodemonArgs).on('restart', () => {
    console.log('restarted!');
  });
});

gulp.task('default', ['develop']);
