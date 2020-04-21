"use strict";

// Load plugins
const autoprefixer = require("gulp-autoprefixer");
const browsersync = require("browser-sync").create();
const cleanCSS = require("gulp-clean-css");
const del = require("del");
const gulp = require("gulp");
const htmlmin = require('gulp-htmlmin');
const header = require("gulp-header");
const merge = require("merge-stream");
const plumber = require("gulp-plumber");
const rename = require("gulp-rename");
const sass = require("gulp-sass");
const babel = require('gulp-babel');
const replace = require('gulp-replace');
const uglify = require("gulp-uglify");
const workbox = require('workbox-build');
const sitemap = require('gulp-sitemap');
var save = require('gulp-save');

// Load package.json for banner
const pkg = require('./package.json');

// Set the banner content
const banner = ['/*!\n',
  ' * <%= pkg.title %> v<%= pkg.version %> (<%= pkg.homepage %>)\n',
  ' * Copyright ' + (new Date()).getFullYear(), ' <%= pkg.author %>\n',
  ' * Licensed under <%= pkg.license %>\n',
  ' */\n',
  '\n'
].join('');

// BrowserSync
function browserSync(done) {
  browsersync.init({
    server: {
      baseDir: "dist/"
    },
    port: 3000
  });
  done();
}

// BrowserSync reload
function browserSyncReload(done) {
  browsersync.reload();
  done();
}

// Clean dist vendor
function clean() {
  return del(["./dist/vendor/", "./src/vendor/"]);
}

// Bring third party dependencies from node_modules into vendor directory
function modules() {
  // Bootstrap JS
  var bootstrapJS = gulp.src('./node_modules/bootstrap/dist/js/*.min.js')
    .pipe(gulp.dest('./dist/vendor/bootstrap/js'));

  // Bootstrap SCSS
  var bootstrapSCSS = gulp.src('./node_modules/bootstrap/scss/**/*')
    .pipe(gulp.dest('./src/vendor/bootstrap/scss'));

  // d3JS
  var d3JS = gulp.src('./node_modules/d3/dist/*.min.js')
    .pipe(gulp.dest('./dist/vendor/d3'));
  // Font Awesome
  var fontAwesome = gulp.src('./node_modules/@fortawesome/**/*.min.css')
    .pipe(gulp.dest('./dist/vendor'));
  var fontAwesome = gulp.src('./node_modules/@fortawesome/**/webfonts/*')
    .pipe(gulp.dest('./dist/vendor'));
  // jQuery Easing
  var jqueryEasing = gulp.src('./node_modules/jquery.easing/*.min.js')
    .pipe(gulp.dest('./dist/vendor/jquery-easing'));
  // jQuery
  var jquery = gulp.src([
      './node_modules/jquery/dist/**/*.min.js',
      '!./node_modules/jquery/dist/core.js'
    ])
    .pipe(gulp.dest('./dist/vendor/jquery'));
  return merge(bootstrapJS, bootstrapSCSS, d3JS, fontAwesome, jquery, jqueryEasing);
}

// CSS task
function css() {
  return gulp
    .src("./src/scss/**/*.scss")
    .pipe(plumber())
    .pipe(sass({
      outputStyle: "expanded",
      includePaths: "./node_modules",
    }))
    .on("error", sass.logError)
    .pipe(autoprefixer({
      cascade: false
    }))
    .pipe(header(banner, {
      pkg: pkg
    }))
    .pipe(gulp.dest("./dist/css"))
    .pipe(rename({
      suffix: ".min"
    }))
    .pipe(cleanCSS())
    .pipe(gulp.dest("./dist/css"))
    .pipe(browsersync.stream());
}

// JS task
function js() {
  return gulp
    .src([
      './src/js/*.js',
      '!./src/js/*.min.js',
    ])
    .pipe(babel({
      presets: ['@babel/preset-env']
    }))
    .pipe(uglify())
    .pipe(header(banner, {
      pkg: pkg
    }))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('./dist/js'))
    .pipe(browsersync.stream());
}

// HTML task
function html() {
  return gulp.src([
    './src/*.html',
    './src/*.xml',
    './src/*.txt',
    './src/*.webmanifest',])
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true
    }))
    .pipe(replace('GA_TRACKING_ID', process.env.GA_TRACKING_ID))
    .pipe(gulp.dest('./dist'));
}

function data() {
  return gulp.src('./data/**/*.json')
  .pipe(gulp.dest('dist/data'));
}

// Icons task
function icons() {
  return gulp
    .src([
      './src/img/*',
    ])
    .pipe(gulp.dest('./dist/img'));
}

function generate_service_worker() {
  return workbox.generateSW({
    globDirectory: './dist',
    globPatterns: [
      '**/*.{html,js,css}'
    ],
    swDest: './dist/sw.js',
    // Define runtime caching rules.
    runtimeCaching: [{
      // Match any request that ends with .png, .jpg, .jpeg or .svg.
      urlPattern: /\.(?:png|jpg|jpeg|svg)$/,

      // Apply a cache-first strategy.
      handler: 'CacheFirst',

      options: {
        // Use a custom cache name.
        cacheName: 'images',

        // Only cache 10 images.
        expiration: {
          maxEntries: 10,
        },
      },
    }, {
      // Match any request that ends with .ttf
      urlPattern: /\.(?:ttf)$/,

      // Apply a cache-first strategy.
      handler: 'CacheFirst',

      options: {
        // Use a custom cache name.
        cacheName: 'fonts',

        // Only cache 3 fonts.
        expiration: {
          maxEntries: 3,
        },
      },
    }],
    clientsClaim: true,
    skipWaiting: true
  }).then(({warnings}) => {
    // In case there are any warnings from workbox-build, log them.
    for (const warning of warnings) {
      console.warn(warning);
    }
    console.info('Service worker generation completed.');
  }).catch((error) => {
    console.warn('Service worker generation failed:', error);
  });
};

// Sitemap task
function buildSitemap() {
    return gulp.src('./dist/*.html', {
            read: false
        })
        .pipe(save('before-sitemap'))
        .pipe(sitemap({
          siteUrl: 'http://www.covidvisual.in',
          getLoc: function(siteUrl, loc, entry) {
          // Removes the file extension if it exists
          return loc.replace(/\.\w+$/, '');},
        }))
        .pipe(gulp.dest('dist/'))
        .pipe(save.restore('before-sitemap'))
};

// Watch files
function watchFiles() {
  gulp.watch("./src/scss/**/*", css);
  gulp.watch(["./src/js/**/*", "!./src/js/**/*.min.js"], js);
  gulp.watch("./src/**/*.html", html);
  gulp.watch("./src/**/*.html", buildSitemap);
  gulp.watch("./data/**/*.json", data);
  gulp.watch("./src/*", browserSyncReload);
}

// Define complex tasks
const vendor = gulp.series(clean, modules);
const build = gulp.series(vendor, gulp.parallel(css, js, html, icons, data), buildSitemap);
const watch = gulp.series(build, gulp.parallel(watchFiles, browserSync));

// Export tasks
exports.css = css;
exports.js = js;
exports.html = html;
exports.data = data;
exports.sitemap = buildSitemap;
exports.clean = clean;
exports.vendor = vendor;
exports.build = build;
exports.watch = watch;
exports.default = build;
