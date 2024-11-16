const globals = require('@jest/globals');

if (!global.jest) {
  global.jest = globals.jest;
  global.expect = globals.expect;
  global.describe = globals.describe;
  global.it = globals.it;
  global.beforeEach = globals.beforeEach;
  global.afterEach = globals.afterEach;
}
