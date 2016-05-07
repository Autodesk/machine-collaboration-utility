const gulp = require(`gulp`);
const sourcemaps = require(`gulp-sourcemaps`);
const babel = require(`gulp-babel`);
const nodemon = require(`gulp-nodemon`);
const autoprefixer = require(`gulp-autoprefixer`);
const mocha = require(`gulp-mocha`);
const rename = require(`gulp-rename`);
const sass = require(`gulp-sass`);

const src = {
  server: `src/server/**/*.js`,
  serverFiles: [`src/**/*.*`, `!src/server/**/*.js`],
  scss: `src/client/scss/styles.scss`,
};

const dest = {
  server: `dist/server`,
  serverFiles: `dist`,
  css: `dist/client`,
};

gulp.task(`build`, [
  `build-server`,
  `build-server-files`,
  `build-scss`,
]);

gulp.task(`build-scss`, () => {
  gulp.src(src.scss)
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

gulp.task(`build-server-files`, () => {
  return gulp.src(src.serverFiles)
  .pipe(gulp.dest(dest.serverFiles));
});

gulp.task(`watch`, () => {
  gulp.watch(
    [src.server],
    [`build-server`]
  );
});

gulp.task(`build-server`, () => {
  return gulp.src(src.server)
  .pipe(sourcemaps.init())
  .pipe(
    babel({
      presets: [`es2015-node5`, `stage-3`],
      plugins: [`transform-async-to-generator`],
    })
  )
  .pipe(sourcemaps.write(`.`))
  .pipe(gulp.dest(dest.server));
});

// Complete every task before starting nodemon
gulp.task(
  `develop`,
  [
    `build`,
    `watch`,
  ],
  () => {
    nodemon({ script: 'dist/server/index.js' })
    .on('restart', () => {
      console.log('restarted!');
    });
  }
);

gulp.task(`default`, [
  `build`,
  `watch`,
  `develop`,
]);

gulp.task(`run-tests`, [`default`], () => {
  // Timeout is ugly hack to allow time for the server instance to initialize
  // TODO Get rid of timeout for running tests

  setTimeout(() => {
    return gulp.src(`./test.js`, { read: false })
    .pipe(mocha())
    .once(`error`, (err) => {
      // Error could be caused by not giving enough time
      // for the server to spin up before starting tests
      console.log(`Testing error:\n`, err);
      process.exit(1);
    })
    .once(`end`, () => {
      process.exit();
    });
  }, 3000);
});

gulp.task(`test`, [
  `default`,
  `run-tests`,
]);
