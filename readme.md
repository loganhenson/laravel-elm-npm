# Laravel Elm Integration

A package to provide support for compiling Elm in Laravel 12+ with Vite.

For use with: [laravel-elm](https://github.com/tightenco/laravel-elm)

**Requirements:**
- Laravel 12.x+
- PHP 8.4 / 8.5  
- Vite 7.x
- Node.js 18+

## Installation

```bash
npm install --save-dev laravel-elm
```

## Configuration

In your `vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import laravelElm from 'laravel-elm';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                'resources/js/elm.js', // Add your Elm entry point
            ],
            refresh: true,
        }),
        laravelElm({
            debug: true, // Enable debug mode for development
        }),
    ],
});
```

## Blade Usage

In your Blade templates, use the `@elm` directive:

```blade
@elm // Uses default path: resources/js/elm.js
// or
@elm('resources/js/custom-elm.js') // Use a custom path
```

## Development

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

## Features

- **Hot Module Replacement (HMR)**: Automatic page updates when Elm files change
- **Debug Mode**: Includes Elm debugger in development
- **Production Optimization**: Automatically optimizes Elm output for production builds
- **WebSocket Support**: Real-time updates during development

## License

[View the license](https://github.com/tightenco/laravel-elm/blob/master/LICENSE) for this repo.
