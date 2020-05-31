# ledshim

  Unofficial JS port of [Pimoroni LED SHIM](https://shop.pimoroni.com/products/led-shim) [python driver](https://github.com/pimoroni/led-shim)

## Installation\

    $ npm install ledshim

## Usage

```javascript
const ledshim = require("ledshim");

ledshim.setPixel(0, 255, 0, 0, 0.8);

ledshim.show();
```

## Example
```javascript
const ledshim = require("ledshim");

let count = 0;
let intervalID = setInterval(() => {
  for (let i = 0; i < 28; i++) {
    ledshim.setPixel(
      i,
      ((count % 3 == 0) ? 255 : 0),  // R
      ((count % 3 == 1) ? 255 : 0),  // G
      ((count % 3 == 2) ? 255 : 0),  // B
      0.8);  // brightness
  }
  ledshim.show();

  count++;
  if (count > 10) {
    clearInterval(intervalID);
  }
}, 500)


ledshim.show();
```

## License

  MIT