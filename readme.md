# Laravel Elm Integration

A package to provide support for compiling Elm via Laravel Mix

Recommended: [laravel-elm](https://github.com/tightenco/laravel-elm)

## Installation

```
npm install --save-dev laravel-elm
```

## Config

In your `webpack.mix.js`:

```
const mix = require('laravel-mix');
const elm = require('laravel-elm');

mix.js('resources/js/app.js', 'public/js')
    .sass('resources/sass/app.scss', 'public/css')
    .then(elm);
```

## License

[View the license](https://github.com/tightenco/laravel-elm/blob/master/LICENSE) for this repo.
