require('dotenv').config();

const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const nodemon = require('gulp-nodemon');
const autoprefixer = require('gulp-autoprefixer');
const mocha = require('gulp-mocha');
const sass = require('gulp-sass');
const webpack = require('gulp-webpack');

const src = {
  reactClient: './react/index.js',
  reactServer: 'react/**/*.js',
  scss: 'client/scss/styles.scss',
  scssWatch: 'client/scss/**/*.scss',
  fonts: './client/fonts/**/*.*',
  images: './client/images/**/*.*',
  vendorJs: './client/vendorJs/**/*.*',
};

const dest = {
  css: './dist/clientAssets',
  fonts: './dist/clientAssets/fonts',
  images: './dist/clientAssets/images',
  react: 'dist/react',
  vendorJs: './dist/clientAssets/vendorJs',
};

gulp.task('build', [
  'build-files',
  'build-scss',
  'build-react-client',
  'build-react-server',
]);

gulp.task('build-files', () => {
  gulp.src(src.images)
  .pipe(gulp.dest(dest.images));
  gulp.src(src.fonts)
  .pipe(gulp.dest(dest.fonts));
  gulp.src(src.vendorJs)
  .pipe(gulp.dest(dest.vendorJs));
});

gulp.task('build-scss', () => {
  return gulp.src(src.scss)
  .pipe(sass({
    outputStyle: 'compressed',
    sourceComments: 'map',
  }))
  .on('error', (err) => {
    console.log(err);
  })
  .pipe(autoprefixer(
    'last 2 version', 'safari 5', 'ie 8', 'ie 9',
    'opera 12.1', 'ios 6', 'android 4'
  ))

  // Funally put the compiled sass into a css file
  .pipe(gulp.dest(dest.css));
});

gulp.task('watch', ['build'], () => {
  gulp.watch([src.scssWatch], ['build-scss']);
  gulp.watch([src.reactServer], ['build-react-client', 'build-react-server']);
});

// Complete every task before starting nodemon
gulp.task(
  'develop',
  [
    'build',
    'watch',
  ],
  () => {
    // Looking to see if we are running 'npm test'
    const npmArgs = JSON.parse(process.env.npm_config_argv);
    const testArg = npmArgs.cooked && npmArgs.cooked[0];
    const nodeArgs = ['--debug'];

    const nodemonArgs = {
      script: 'server/index.js',
      nodeArgs: ['--debug'],
      ignore: ['./uploads'],
    };

    if (testArg === 'test') {
      nodemonArgs.env = { NODE_ENV: 'test' };
    }

    return nodemon(nodemonArgs)
    .on('restart', () => {
      console.log('restarted!');
    });
  }
);

gulp.task('build-react-client', () => {
  return gulp.src(src.reactClient)
    .pipe(webpack({
      entry: ['babel-polyfill', src.reactClient],
      output: {
        path: `/${dest.css}`,
        filename: 'bundle.js',
        publicPath: '/',
      },
      devtool: 'eval',
      module: {
        preLoaders: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'source-map',
          },
        ],
        loaders: [
          {
            test: /\.js$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
            query: {
              presets: ['es2015', 'es2017', 'react'],
            },
          },
        ],
      },
    }))
    .pipe(gulp.dest(dest.css));
});

gulp.task('build-react-server', () => {
  return gulp.src(src.reactServer)
  .pipe(sourcemaps.init())
  .pipe(
    babel({
      presets: ['react', 'node6'],
    })
  )
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(dest.react));
});

gulp.task('test', ['default'], () => {
  // Timeout is ugly hack to allow time for the server instance to initialize
  // TODO Get rid of timeout for running tests
  setTimeout(() => {
    return gulp.src('./test.js', { read: false })
    .pipe(mocha())
    .once('error', (err) => {
      // Error could be caused by not giving enough time
      // for the server to spin up before starting tests
      console.log('Testing error:\n', err);
      process.exit(1);
    })
    .once('end', () => {
      process.exit();
    });
  }, 10000);
});

gulp.task('default', [
  'build',
  'watch',
  'develop',
]);
