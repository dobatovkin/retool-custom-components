# retool-custom-components

Monorepa to handle all custom components developed for Retool.

## Development

Clone this repo. As each component has its own package.json, you need to run

```shell
cd [component-folder]
```

For a first time, you need to setup git hooks using

```shell
npm run prepare
```

To start a dev server, run
```shell
npm run dev
```

Then in the component inspector, replace the default iFrame code with the following:

```html
<script type="text/javascript" src="http://localhost:8080/index.js" />
```
