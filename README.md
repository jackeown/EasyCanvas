# EasyCanvas - HTML canvas the easy way!

EasyCanvas wraps the html5 `canvas` element, exposing a new `easy-canvas` custom html element. An instance of `easy-canvas` will have its own .ctx variable which is a 2D canvas context.

We have scales to make plotting your own data easy.

We have "Hot and Ready" line plot, bar plot, etc. in `easyCanvasHotAndReady.js`

Look <a href="https://jackeown.github.io/2019/06/01/easyCanvas.html">here</a> or <a href="https://jackeown.github.io/EasyCanvas">here</a> for some examples and more information.


In order to allow for javascript importing between multiple files, we use "browserify"
which allows us to use the nodejs "require" syntax for importing js files from other js files.

To install browserify, simply run:
```bash
sudo npm install -g browserify
```

Then, to build `easyCanvas.bundle.js`, run the following command:
```bash
browserify -e easyCanvas.js -o easyCanvas.bundle.js
```

