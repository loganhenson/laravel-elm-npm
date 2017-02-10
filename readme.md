# Laravel Elm Integration

A package to provide support for compiling Elm in Laravel

Recommended: [laravel-elm](https://github.com/tightenco/laravel-elm)

## Installation

```
npm install --save-dev laravel-elm
```
or
```
yarn add --dev laravel-elm
```

## Config

In your `webpack.mix.js`:

```
let mix = require('laravel-mix').mix;
let elm = require('laravel-elm');

mix.js('resources/assets/js/app.js', 'public/js')
    .sass('resources/assets/sass/app.scss', 'public/css')
    .then(elm);
```

## License

[View the license](https://github.com/tightenco/laravel-elm/blob/master/LICENSE) for this repo.
