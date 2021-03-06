var _system = require('system');

var options = {
	debug: false,
	faildump: false,
	timeout: 5000,
	step: 10,
	files: []
};


var args = _system.args.slice(1);
args.forEach(function(arg) {
	var rx_value = /^--(\w+)=(\w+)$/;
	var rx_bool = /^--(\w+)$/;

	var bool_matches = arg.match(rx_bool);
	var value_matches = arg.match(rx_value);

	if (value_matches && value_matches.length === 3) {
		// Translate --optionName=value args to options.optionName = value;
		// Convert to int if possible
		var num_val = parseInt(value_matches[2], 10);
		options[value_matches[1]] = isNaN(num_val) ? value_matches[2] : num_val;
		//var value = options[value_matches[1]];
		//console.log(value, typeof value);
	} else if (bool_matches && bool_matches.length) {
		// Translate --optionName args to options.optionName = true;
		options[bool_matches[1]] = true;
	} else {
		options.files.push(arg);
		// console.log('FILE/DIR:', arg);
	}
});

exports.parseArguments = function() {
	return options;
};

