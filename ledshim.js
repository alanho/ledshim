const i2c = require('i2c-bus');

const _MODE_REGISTER = 0x00;
const _FRAME_REGISTER = 0x01;
const _AUTOPLAY1_REGISTER = 0x02;
const _AUTOPLAY2_REGISTER = 0x03;
const _BLINK_REGISTER = 0x05;
const _AUDIOSYNC_REGISTER = 0x06;
const _BREATH1_REGISTER = 0x08;
const _BREATH2_REGISTER = 0x09;
const _SHUTDOWN_REGISTER = 0x0a;
const _GAIN_REGISTER = 0x0b;
const _ADC_REGISTER = 0x0c;

const _CONFIG_BANK = 0x0b;
const _BANK_ADDRESS = 0xfd;

const _PICTURE_MODE = 0x00;
const _AUTOPLAY_MODE = 0x08;
const _AUDIOPLAY_MODE = 0x18;

const _ENABLE_OFFSET = 0x00;
const _BLINK_OFFSET = 0x12;
const _COLOR_OFFSET = 0x24;

const LOOKUP = [
  [118, 69, 85],
  [117, 68, 101],
  [116, 84, 100],
  [115, 83, 99],
  [114, 82, 98],
  [113, 81, 97],
  [112, 80, 96],
  [134, 21, 37],
  [133, 20, 36],
  [132, 19, 35],
  [131, 18, 34],
  [130, 17, 50],
  [129, 33, 49],
  [128, 32, 48],

  [127, 47, 63],
  [121, 41, 57],
  [122, 25, 58],
  [123, 26, 42],
  [124, 27, 43],
  [125, 28, 44],
  [126, 29, 45],
  [15, 95, 111],
  [8, 89, 105],
  [9, 90, 106],
  [10, 91, 107],
  [11, 92, 108],
  [12, 76, 109],
  [13, 77, 93],
]

const WIDTH = 28;
const HEIGHT = 1;

const LED_GAMMA = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2,
  2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5,
  6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 11, 11,
  11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18,
  19, 19, 20, 21, 21, 22, 22, 23, 23, 24, 25, 25, 26, 27, 27, 28,
  29, 29, 30, 31, 31, 32, 33, 34, 34, 35, 36, 37, 37, 38, 39, 40,
  40, 41, 42, 43, 44, 45, 46, 46, 47, 48, 49, 50, 51, 52, 53, 54,
  55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
  71, 72, 73, 74, 76, 77, 78, 79, 80, 81, 83, 84, 85, 86, 88, 89,
  90, 91, 93, 94, 95, 96, 98, 99, 100, 102, 103, 104, 106, 107, 109, 110,
  111, 113, 114, 116, 117, 119, 120, 121, 123, 124, 126, 128, 129, 131, 132, 134,
  135, 137, 138, 140, 142, 143, 145, 146, 148, 150, 151, 153, 155, 157, 158, 160,
  162, 163, 165, 167, 169, 170, 172, 174, 176, 178, 179, 181, 183, 185, 187, 189,
  191, 193, 194, 196, 198, 200, 202, 204, 206, 208, 210, 212, 214, 216, 218, 220,
  222, 224, 227, 229, 231, 233, 235, 237, 239, 241, 244, 246, 248, 250, 252, 255];



class LEDShim {

  constructor(addr, width) {
    this.addr = addr;
    this.width = width;

    this.i2c = undefined;

    this.is_setup = false;
    this.clear_on_exit = true;

    this.brightness = 1.0;

    this.clear();
  }

  setup() {
    if (this.is_setup) {
      return true;
    }
    this.is_setup = true;
    this.i2c = i2c.openSync(1);
    this.reset();
    this.show();

    this.bank(_CONFIG_BANK);
    this.write(this.addr, _MODE_REGISTER, [_PICTURE_MODE], 'setup');
    this.write(this.addr, _AUDIOSYNC_REGISTER, [0]), 'setup';

    let enable_pattern = [
      0b00000000, 0b10111111,
      0b00111110, 0b00111110,
      0b00111111, 0b10111110,
      0b00000111, 0b10000110,
      0b00110000, 0b00110000,
      0b00111111, 0b10111110,
      0b00111111, 0b10111110,
      0b01111111, 0b11111110,
      0b01111111, 0b00000000,
    ]

    this.bank(1);
    this.write(this.addr, 0x00, enable_pattern, 'setup');

    this.bank(0);
    this.write(this.addr, 0x00, enable_pattern, 'setup');

    process.on('exit', () => {
      this.clearOnExit();
    });

    process.on('SIGINT', () => {
      process.exit();
    });


  }

  clear() {
    this.current_frame = 0;
    this.buf = Array.from(Array(this.width), () => [0, 0, 0, 1.0]);
  }

  clearOnExit() {
    if (this.clear_on_exit) {
      this.clear();
      this.show();
    }
  }

  setClearOnExit(v) {
    this.clear_on_exit = !!v;
  }

  setBrightness(br) {
    this.brightness = br;
  }

  setAll(r, g, b, br = 1.0) {
    for (let i = 0; i < this.width; i++) {
      this.setPixel(i, r, g, b, br);
    }
  }

  setPixel(x, r, g, b, br = 1.0) {
    [r, g, b] = [r, g, b].map((v) => Math.trunc(v));

    for (let v of [r, g, b]) {
      if (isNaN(v) || v > 255 || v < 0) {
        throw 'Invalid RGB value. Must be 0 <= value <= 255'
      }
    }

    if (x < 0 || x >= this.width) {
      throw 'Invalid pixel index';
    }

    this.buf[x] = [r, g, b, br];
  }

  // rip from underscore.js
  chunk(array, count) {
    if (count == null || count < 1) return [];
    var result = [];
    var i = 0, length = array.length;
    while (i < length) {
      result.push(array.slice(i, i += count));
    }
    return result;
  }

  show() {
    this.setup();

    let next_frame = this.current_frame == 1 ? 0 : 1;
    let output = Array(144).fill(0);

    for (let x = 0; x < this.width; x++) {
      let [r, g, b, br] = this.buf[x];
      [r, g, b] = [r, g, b].map((v) => LED_GAMMA[Math.trunc(v * this.brightness * br)]);

      [r, g, b].forEach((v, i) => {
        let idx = LOOKUP[x][i];
        output[idx] = v;
      });
    }

    this.bank(next_frame);

    let offset = 0;


    let chunks = this.chunk(output, 32);

    for (let chk of chunks) {
      this.write(this.addr, _COLOR_OFFSET + offset, chk)
      offset += 32;
    }

    this.frame(next_frame);
  }

  reset() {
    this.sleep(true);
    this.sleep(false);
  }

  sleep(value) {
    return this.register(_CONFIG_BANK, _SHUTDOWN_REGISTER, !value);
  }

  frame(frame, show = true) {
    if (frame < 0 || frame > 8) {
      throw 'invalid frame value';
    }

    this.current_frame = frame;

    if (show) {
      this.register(_CONFIG_BANK, _FRAME_REGISTER, frame);
    }
  }

  bank(bank) {
    return this.write(this.addr, _BANK_ADDRESS, [bank]);
  }

  write(addr, cmd, data, callsite) {
    let buffer = Buffer.from(data);
    return this.i2c.writeI2cBlockSync(addr, cmd, buffer.length, buffer);
  }

  register(bank, register, value) {
    this.bank(bank);
    this.write(this.addr, register, [value]);
  }
}

module.exports = new LEDShim(0x75, 28);