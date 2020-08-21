# Laravel Elm Integration

A package to provide support for compiling Elm via Laravel Mix

Recommended: [laravel-elm](https://github.com/tightenco/laravel-elm)

## Installation

```
npm install --save-dev laravel-elm
```

## Config

In your `webpack.mix.js`:
> Production Example
```
const mix = require("laravel-mix");
const elm = require("laravel-elm");

mix.extend("elm", elm);

mix
    .js("resources/js/app.js", "public/js")
    .elm()
    .combine(["public/js/app.js", "public/js/elm.js"], "public/js/all.js")
    .postCss("resources/css/main.css", "public/css", [require("tailwindcss")]);

if (mix.inProduction()) {
    mix
        .minify("public/js/all.js")
        .version();
}
```

## `app.blade.php`
```blade
...
<head>
    <link href="{{ mix('/css/main.css') }}" rel="stylesheet" />
</head>

<body class="bg-gray-100 max-w-screen-lg mx-auto">
    @elm
    <script src="{{ mix('/js/all.js') }}"></script>
</body>
...
```

## License

[View the license](https://github.com/tightenco/laravel-elm/blob/master/LICENSE) for this repo.
