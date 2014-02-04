/*
	TODO:
	[ ] Actions & Asserts
		[ ] Save succesful tests screendump and compare with crrent action
	[ ] CLI arguments:
		[ ] Behavior on fail (continue, next, stop)
	[X] Viewport size config action
		[X] Resize action with resize event
	[ ] Log files
	[ ] Failure messages
	[ ] SlimerJS compatibility?
	[ ] assertCSS    prop    value
	[ ] Really think about when to test for visibility
	[ ] oninput event support?
	[ ] Horizontal scrolling support
		[X] Use page.scrollPosition()
			http://phantomjs.org/api/webpage/property/scroll-position.html
*/

phantom.clearCookies();

var _start_time        = new Date();
var _cli_args          = require('./lib/arguments').parseArguments();
var _test_files        = require('./lib/testreader').readTestFiles();
var _screendump         = require('./lib/screendump');
var _page               = require('webpage').create();
var _actions           = require('./lib/actions').actions;
var _logger            = require('./lib/logger');
var _current_test_file = null;
var _current_action    = null;
var _total_actions     = 0;
var _skipped           = [];

_page.is_loaded = false;
_page.is_loading = false;


function setupPage() {
	if (_page.is_loaded) return;

	_page.evaluate(function() {
		window.localStorage.clear();
	});

	_page.is_loaded = true;
	_page.is_loading = false;
}



/*
_page.onInitialized = function() {
};
_page.onNavigationRequested = function() {
};
*/

_page.onLoadFinished = setupPage;


_page.onLoadStarted = function() {
	_page.is_loaded = false;
	_page.is_loading = true;
	_page.scrollPosition = {
		top: 0,
		left: 0
	};
};


_page.onError = function() {
};


_page.onConsoleMessage = function(message) {
	if (_cli_args.debug) {
		_logger.comment('    // ', message);
	}
};


function nextTestFile() {
	// Clean up after ourselves
	if (_current_test_file && _current_action) {
		_page.evaluate(function() {
			window.localStorage.clear();
		});
	}

	_current_action = null;
	_current_test_file = _test_files.shift();
	if (!_current_test_file) {
		done();
		return;
	}

	_logger.comment('\n################################################################');
	_logger.comment('# Starting ' + _current_test_file.path + ' (' + _current_test_file.actions.length + ' actions)');
	_logger.comment('################################################################');

	_page.is_loaded = false;
	_page.is_loading = false;

	nextAction();
}


function waitFor(conditionCallback, passCallback, failCallback, timeout) {
	if (timeout > 0) {
		var is_passed = !_page.is_loading && conditionCallback();
		if (is_passed) {
			passCallback();
		} else {
			setTimeout(function() {
				waitFor(conditionCallback, passCallback, failCallback, timeout - _cli_args.step);
			}, _cli_args.step);
		}
	} else {
		failCallback();
	}
}


function nextAction() {
	_current_action = _current_test_file.actions.shift();

	if (!_current_action) {
		nextTestFile();
		return;
	}

	var handler = _actions[_current_action.type];
	var args = [_current_action.type].concat(_current_action.args);

	if (handler) {
		waitFor(

			// Keep executing until it returns true
			function() {
				return handler.apply(_actions, _current_action.args);
			},

			// Run after true is returned
			passCurrentAction,

			// Or run this after timeout is reached...
			failCurrentAction,

			// ...which is this long:
			_cli_args.timeout);
	} else {
		failCurrentAction();
	}
}


function passCurrentAction() {
	if (_current_action.type !== 'log') {
		//_screendump.dump('pass-' + _current_action.type);
		var args = [_current_action.type].concat(_current_action.args);
		message = _logger.tabularize(args);
		_logger.log('  ✓ ' + message);
		_total_actions++;
	}

	// If the previous action resulted in a page (re)load we need to give it
	// some time to trigger the onNavigationRequested event. Until the next
	// page is loaded, the next action will fail
	setTimeout(nextAction, 5);
}


function failCurrentAction() {
	if (_cli_args.faildump) _screendump.dump('faildump' + _current_test_file.path.replace(/\.?\//g, '__'));

	var args = [_current_action.type].concat(_current_action.args);
	message = _logger.tabularize(args);
	_logger.error('  ✗ ' + message);
	_skipped.push(_current_test_file.path);
	nextTestFile();
}


function done() {
	var exit_code = 0;
	var result = 'PASS';
	var total_time = Math.round((new Date().valueOf() - _start_time) / 1000);
	var message = 'Executed ' + _total_actions + ' actions';

	if (_skipped.length) {
		exit_code = 1;
		result = 'FAIL';
		message += ', Failed ' + _skipped.length + ' test files:';
		message += ' in ' + _skipped.join(', ');
	} else {
		message += ' in ' + total_time + 's.';
	}


	var codes = [30, 41];
	message = result + ': ' + message;
	_logger[result.toLowerCase()](message);
	phantom.exit(exit_code);
}




// Get the party started
nextTestFile();
