const gulp = require(`gulp`);
const sourcemaps = require(`gulp-sourcemaps`);
const babel = require(`gulp-babel`);
const nodemon = require(`gulp-nodemon`);
const autoprefixer = require(`gulp-autoprefixer`);
const mocha = require(`gulp-mocha`);
const rename = require(`gulp-rename`);

// TODO make sure the foreman server restarts on change

const src = {
  serverJs: `src/app/**/*.js`,
  clientJs: `src/client/**/*.js`,
  middlewareServerJs: `src/middleware/**/server/**/*.js`,
  middlewareModelJs: `src/middleware/**/model/**/*.js`,
  middlewareClientJs: `src/middleware/**/client/**/*.js`,
  views: `src/app/views/**/*.jade`,
  viewsMiddleware: `src/middleware/**/client/**/*.jade`,
  swaggerYaml: `src/middleware/**/*.yaml`,
  docs: `src/docs/**/*.*`,
  tests: `src/middleware/**/test/test.js`,
  testAssets: `src/middleware/**/test/**/*`,
};

const dest = {
  server: `dist/server`,
  middleware: `dist/server/middleware`,
  clientJs: `./dist/client`,
  views: `dist/server/views`,
  docs: `dist/client/docs`,
  yaml: `dist/client/docs/middleware`,
  src: `src/middleware/**/test/test.js`,
  tests: `dist/tests`,
};

gulp.task(`build`, [
  `build-server`,
  `build-views`,
  `build-client-js`,
  `build-server-middleware`,
  `build-views-middleware`,
  `build-client-js-middleware`,
  `build-docs`,
  `build-doc-yaml`,
  `build-tests`,
]);

gulp.task(`watch`, () => {
  gulp.watch([src.serverJs, src.middlewareServerJs, src.middlewareModelJs], [`build-server`, `build-server-middleware`]);
  gulp.watch([src.clientJs], [`build-client-js`]);
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
      presets: [`es2015-node5`],
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
      presets: [`es2015-node5`],
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

gulp.task(`build-test-assets`, () => {
  return gulp.src(src.testAssets)
  .pipe(rename((testPath) => {
    testPath.dirname = testPath.dirname.replace(`/test`, ``);
  }))
  .pipe(gulp.dest(dest.tests));
});


gulp.task(`build-tests`, [`build-test-assets`], () => {
  return gulp.src(src.tests)
  .pipe(sourcemaps.init())
	.pipe(
    babel({
      presets: [`es2015-node5`],
      plugins: [`transform-async-to-generator`],
    })
  )
  .pipe(rename((testPath) => {
    testPath.dirname = testPath.dirname.replace(`/test`, ``);
  }))
  .pipe(sourcemaps.write(`.`))
  .pipe(gulp.dest(dest.tests));
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
