ace.define('ace/mode/gnuplot_highlight_rules', ['require','exports','module','ace/lib/oop','ace/mode/text_highlight_rules'], function(require, exports) {
  const oop = require('ace/lib/oop'), TextHighlightRules = require('ace/mode/text_highlight_rules').TextHighlightRules;
  const GnuplotHighlightRules = function() {
    this.$rules = { start: [
      { token: 'comment', regex: '#.*$' },
      { token: 'string', regex: '"', next: 'double' }, { token: 'string', regex: "'", next: 'single' },
      { token: 'comment', regex: '<<\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*$', onMatch: function(value, state, stack) { stack[0] = value.replace(/<<\s*/, '').trim(); return 'comment'; }, next: 'data' },
      { token: 'variable', regex: '\\$[A-Za-z_][A-Za-z0-9_]*' },
      { token: 'constant.numeric', regex: '\\b(?:0x[0-9a-fA-F]+|\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\b' },
      { token: 'keyword', regex: '\\b(?:plot|splot|set|unset|reset|fit|stats|do|for|while|if|else|print|pause|load|reread|exit|quit|replot|with|using|title|notitle)\\b' },
      { token: 'support.function', regex: '\\b(?:sin|cos|tan|exp|log|sqrt|abs|atan2|sprintf|int|rand|lines|points|linespoints|boxes|histograms|yerrorbars|filledcurves|vectors|image|pm3d|contours|terminal|output|xlabel|ylabel|xrange|yrange|grid|key|palette|multiplot|polar|parametric|samples|isosamples|view)\\b' }
    ], double: [{ token: 'constant.language.escape', regex: '\\\\.' }, { token: 'string', regex: '"', next: 'start' }, { defaultToken: 'string' }],
    single: [{ token: 'string', regex: "'", next: 'start' }, { defaultToken: 'string' }],
    data: [{ token: 'comment', regex: '^.*$', onMatch: function(value, state, stack) { if (value.trim() === stack[0]) { this.next = 'start'; stack.length = 0; } else this.next = 'data'; return 'comment'; } }] };
    this.normalizeRules();
  };
  oop.inherits(GnuplotHighlightRules, TextHighlightRules); exports.GnuplotHighlightRules = GnuplotHighlightRules;
});
ace.define('ace/mode/gnuplot', ['require','exports','module','ace/lib/oop','ace/mode/text','ace/mode/gnuplot_highlight_rules'], function(require, exports) {
  const oop = require('ace/lib/oop'), TextMode = require('ace/mode/text').Mode;
  const Mode = function() { this.HighlightRules = require('ace/mode/gnuplot_highlight_rules').GnuplotHighlightRules; };
  oop.inherits(Mode, TextMode); Mode.prototype.lineCommentStart = '#'; Mode.prototype.$id = 'ace/mode/gnuplot'; exports.Mode = Mode;
});
