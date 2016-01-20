const gulp = require(`gulp`);
const sourcemaps = require(`gulp-sourcemaps`);
const babel = require(`gulp-babel`);
const nodemon = require(`gulp-nodemon`);
const sass = require(`gulp-sass`);
const autoprefixer = require(`gulp-autoprefixer`);
const mocha = require(`gulp-mocha`);
const rename = require(`gulp-rename`);
const foreman = require('gulp-foreman');

// TODO make sure the foreman server restarts on change

const src = {
  serverJs: `src/server/**/*.js`,
  clientJs: `src/client/**/*.js`,
  middlewareServerJs: `src/middleware/**/server/**/*.js`,
  middlewareModelJs: `src/middleware/**/model/**/*.js`,
  middlewareClientJs: `src/middleware/**/client/**/*.js`,
  clientStyles: `src/client/scss/styles.scss`,
  views: `src/server/views/**/*.jade`,
  viewsMiddleware: `src/middleware/**/client/**/*.jade`,
  swaggerYaml: `src/middleware/**/*.yaml`,
  docs: `src/docs/**/*.*`,
  images: `src/client/images/**/*.*`,
};

const dest = {
  server: `dist/server`,
  middleware: `dist/server/middleware`,
  clientJs: `./dist/client`,
  clientStyles: `./dist/client/css`,
  images: `dist/client/images`,
  views: `dist/server/views`,
  docs: `dist/client/docs`,
  yaml: `dist/client/docs/middleware`,
};

gulp.task(`build`, [
  `build-styles`,
  `build-images`,
  `build-server`,
  `build-views`,
  `build-client-js`,
  `build-server-middleware`,
  `build-views-middleware`,
  `build-client-js-middleware`,
  `build-docs`,
  `build-doc-yaml`,
]);

gulp.task(`watch`, () => {
  gulp.watch([src.serverJs, src.middlewareServerJs, src.middlewareModelJs], [`build-server`, `build-server-middleware`]);
  gulp.watch([src.clientJs], [`build-client-js`]);
  gulp.watch([src.clientStyles], [`build-styles`]);
  gulp.watch(src.views, [`build-views`]);
  gulp.watch(src.viewsMiddleware, [`build-views-middleware`]);
  gulp.watch(src.middlewareClientJs, [`build-client-js-middleware`]);
  gulp.watch(src.swaggerYaml, [`build-doc-yaml`]);
});

gulp.task(`build-server`, () => {
  return gulp.src(src.serverJs)
  .pipe(sourcemaps.init())
	.pipe(
    babel({
      presets: [`es2015-node4`],
      plugins: [`transform-async-to-generator`],
    })
  )
	.pipe(sourcemaps.write(`.`))
	.pipe(gulp.dest(dest.server));
});

gulp.task(`build-server-middleware`, () => {
  return gulp.src([
    src.middlewareServerJs,
    src.middlewareModelJs,
  ])
  .pipe(sourcemaps.init())
	.pipe(
    babel({
      presets: [`es2015-node4`],
      plugins: [`transform-async-to-generator`],
    })
  )
  .pipe(rename((serverMiddlewarePath) => {
    serverMiddlewarePath.dirname = serverMiddlewarePath.dirname.replace(`/server`, ``);
  }))
	.pipe(sourcemaps.write(`.`))
	.pipe(gulp.dest(dest.middleware));
});

gulp.task(`build-client-js`, () => {
  return gulp.src(src.clientJs)
  .pipe(sourcemaps.init())
	.pipe(
    babel({
      presets: [`es2015`],
      plugins: [
        `syntax-async-functions`,
        `transform-regenerator`,
      ],
    })
  )
  // TODO sequentially require and minify modules
	.pipe(sourcemaps.write(`.`))
	.pipe(gulp.dest(dest.clientJs));
});

gulp.task(`build-client-js-middleware`, () => {
  return gulp.src(src.middlewareClientJs)
  .pipe(sourcemaps.init())
	.pipe(
    babel({
      presets: [`es2015`],
      plugins: [
        `syntax-async-functions`,
        `transform-regenerator`,
      ],
    })
  )
  // TODO sequentially require and minify modules
  // .pipe(concat(`all.js`))
  .pipe(rename((clientJsPath) => {
    clientJsPath.dirname = clientJsPath.dirname.replace(`/client`, ``);
  }))
	.pipe(sourcemaps.write(`.`))
	.pipe(gulp.dest(dest.clientJs + '/js'));
});

gulp.task(`build-styles`, () => {
  return gulp.src(src.clientStyles)
  .pipe(sass({
    outputStyle: `compressed`,
    sourceComments: `map`,
  }))
  .pipe(autoprefixer(
    `last 2 version`, `safari 5`, `ie 8`, `ie 9`,
    `opera 12.1`, `ios 6`, `android 4`
  ))
  .pipe(gulp.dest(dest.clientStyles));
});

gulp.task(`build-images`, () => {
  return gulp.src(src.images)
  .pipe(gulp.dest(dest.images));
});

gulp.task(`build-views`, () => {
  return gulp.src(src.views)
  .pipe(gulp.dest(dest.views));
});

gulp.task(`build-views-middleware`, () => {
  return gulp.src(src.viewsMiddleware)
  .pipe(rename((middlewarePath) => {
    middlewarePath.dirname = middlewarePath.dirname.replace(`/client`, ``);
  }))
  .pipe(gulp.dest(dest.views));
});

gulp.task(`build-docs`, () => {
  return gulp.src(src.docs)
  .pipe(gulp.dest(dest.docs));
});

gulp.task(`build-doc-yaml`, () => {
  return gulp.src(src.swaggerYaml)
  .pipe(rename((yamlPath) => {
    yamlPath.dirname = ``;
  }))
  .pipe(gulp.dest(dest.yaml));
});

// Complete every task before starting nodemon
gulp.task(
  `develop`,
  [
    `build`,
    `watch`,
  ],
  () => {
    nodemon({ script: 'dist/server/server.js' })
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

  // Errors are not added to a log file
  // TODO add logging to tests

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
