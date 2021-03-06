var _mouse      = require('./mouse').mouse;
var _screendump = require('./screendump');

var _focused    = '';


function getJQuery() {
	var has_jquery = _page.evaluate(function() {
		return 'jQuery' in window;
	});


	if (!has_jquery) {
		_page.injectJs('./lib/jquery-2.0.3.js');

		_page.evaluate(function() {
			jQuery.noConflict();
		});
	}

	var is_dummy_ready = _page.evaluate(function() {
		return 'is_dummy_ready' in jQuery;
	});

	if (!is_dummy_ready) {
		_page.injectJs('./lib/jquery.assert.js');
	}
}


function jQueryAssert(type) {
	return function() {
		getJQuery();
		// args = ['.selector', 'Some text']
		var args = [].slice.call(arguments, 0);

		// args = ['assertText', '.selector', 'Some text']
		args.unshift(type);

		var remoteAssert = function() {
			var type = arguments[0];
			var selector = arguments[1];
			var args = [].slice.call(arguments, 2);
			var $result = jQuery(selector);
			return $result['dummy_' + type].apply($result, args);
		};

		args.unshift(remoteAssert);

		var result = _page.evaluate.apply(_page, args);

		return result;
	};
}


var actions = {
	open: function(url, dimensions) {
		if (_page.is_loaded) {
			_mouse.reset();
			return true;
		}

		if (_page.is_loading) {
			return false;
		}

		if (dimensions) {
			this.resize(dimensions);
		} else {
			_page.viewportSize = {
				width: 1280,
				height: 1280
			};
		}

		_page.is_loaded = false;
		_page.is_loading = true;

		_page.open(url);

		return false;
	},

	assertTitle: function(sub_title) {
		var title = _page.evaluate(function() {
			return document.title;
		});
		return title.indexOf(sub_title) !== -1;
	},

	assertPage: function(sub_url) {
		var url = _page.evaluate(function() {
			return location.href;
		});
		return url.indexOf(sub_url) !== -1;
	},

	assertUrl: function(expression) {
		var url = _page.evaluate(function() {
			return location.href;
		});
		return new RegExp(expression).test(url);
	},

	log: function(message) {
		_logger.info('\n# ' + message);
		return true;
	},

	render: function(title) {
		screendump.dump(title);
		return true;
	},

	submit: function(selector, text) {
		getJQuery();
		if (!this.assertVisible(selector)) {
			return false;
		}

		_page.evaluate(function(selector) {
			jQuery(selector).trigger('submit');
		}, selector);

		return true;
	},

	type: function(selector, text) {
		if (!this.assertVisible(selector)) {
			return false;
		}

		if (!text.length) {
			return true;
		}

		if (_focused !== selector) {
			this.click(selector);
			return false;
		}

		if (text.length === 1) {
			_page.sendEvent('keypress', text, null, null, 0);
		} else {
			while (text) {
				/*
					Matches all keys from
					https://github.com/ariya/phantomjs/commit/cab2635e66d74b7e665c44400b8b20a8f225153a
					in the form <KeyName>
				*/
				var special_keys = /^<([^>]+)>/;
				var matches = text.match(special_keys);

				if (matches && matches.length) {
					var key = matches[1];
					text = text.substr(matches[0].length);
					_page.sendEvent('keypress', _page.event.key[key], null, null, 0);
				} else {
					var character = text.charAt(0);
					this.type(selector, character);
					text = text.substr(1);
				}
			}

			// Reset focused element, as keyevent may have triggered a blur()
			_focused = '';
		}

		return true;
	},

	click: function(destination) {
		var center = this.getCoordinates(destination);
		if (!center) return false;

		if (_mouse.click(center.left, center.top)) {
			_focused = destination;
			return true;
		}
		return false;
	},

	// destination can be either a string containing "123, 567" or a css
	// selector
	moveMouseTo: function(destination) {
		var center = this.getCoordinates(destination);
		if (!center) return false;

		return _mouse.moveTo(center.left, center.top);
	},

	dblclick: function(destination) {
		var center = this.getCoordinates(destination);
		if (!center) return false;

		if (_mouse.dblclick(center.left, center.top)) {
			_focused = destination;
			return true;
		}
		return false;
	},

	resize: function(dimensions) {
		var widthxheight = /^(\d+)x(\d+)$/;
		var matches = dimensions.match(widthxheight);
		if (matches && matches.length === 3) {
			_page.viewportSize = {
				width: parseInt(matches[1], 10),
				height: parseInt(matches[2], 10)
			};
		}

		return true;
	},

	getCoordinates: function(destination) {
		getJQuery();
		var coordinates_rx = /(\d+), ?(\d+)/;
		var coordinates = destination.match(coordinates_rx);

		if (coordinates && coordinates.length) {
			return {
				left: parseInt(coordinates[0], 10),
				top: parseInt(coordinates[1], 10)
			};
		} else if (this.assertVisible(destination)) {
			return this.getCenter(destination);
		}

		return null;
	},

	screendump: function(filename, selector) {
		var boundaries;
		if (selector) {
			boundaries = this.getBoundaries(selector);
		}
		_screendump.dump(filename, boundaries);
		return true;
	}
};

// All these asserts and actions are defined in jquery.assert.js and executed
// in the context of the webpage
[
	'assertText',
	'assertExists',
	'assertVisible',
	'assertHidden',
	'assertEmpty',
	'assertNotEmpty',
	'assertLength',
	'assertMinLength',
	'assertMaxLength',
	'assertValue',
	'assertHasClass',
	'assertNotHasClass',
	'assertDisabled',
	'assertCSS',
	'choose',
	'getCenter',
	'getBoundaries',
	'getViewPort'
].forEach(function(type) {
	actions[type] = jQueryAssert(type);
});

exports.actions = actions;
