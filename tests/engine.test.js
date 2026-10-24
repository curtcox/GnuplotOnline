const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/gnuplot-core.js');
let runner;
before(async () => { runner = await core.create((await import('../vendor/gnuplot/gnuplot.js')).default); });
test('SVG, data blocks, files, diagnostics and repeat runs use the real engine', () => {
  assert.match(runner.run('plot sin(x)').svg, /gnuplot/);
  assert.match(runner.run('$D << EOD\n1 2\n2 4\nEOD\nplot $D with lines').svg, /<svg/);
  assert.equal(runner.run("plot 'values.dat' with lines", { 'values.dat': '1 2\n2 3' }).exitCode, 0);
  const error = runner.run('set title "Test"\ninvalid_command');
  assert.equal(error.errors[0]?.line, 2);
  assert.equal(error.errors[0]?.file, 'script.gp');
  assert.match(runner.run('set term dumb\nset output\nplot x').stdout, /\+/);
  for (let i = 0; i < 50; i++) assert.match(runner.run(`plot x+${i}`).svg, /<svg/);
});
