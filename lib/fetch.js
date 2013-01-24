var
	async = require("async"),
	_ = require("lodash"),
	cp = require("child_process"),
	fs = require("fs"),
	path = require("path"),
	argv = require("optimist").argv;

var homeDir = path.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.fetchjs');

var repoExists = function(cb) {
	fs.exists(homeDir, function(exists) {
		if (!exists) return cb(new Error('fetchjs repository doesn\'t exist, did you run \'init\' yet?'));
		cb();
	});
}

var gitExists = function(cb) {
	cp.exec('which git', function(err) {
		if (err) return cb(new Error("'git' is required"));
		cb();
	});
}

var checkReqs = function(cb, ignore) {
	async.parallel(_.difference([repoExists, gitExists], ignore || []), cb);
}

var handlers = {}

handlers['update'] = function(cb) {
	cp.exec('git fetch', { cwd: homeDir }, function(err, stdout, stderr) {
		if (err) return console.log('Failed to update repo: ' + err.message);
	});
}

handlers['init'] = {
	ignore: repoExists,
	operator: function(cb) {
		console.log('Initializing repo, please wait ...');
		cp.exec('git clone git://github.com/cdnjs/cdnjs.git ' + homeDir, function(err, stdout, stderr) {
			if (err) return console.log('Failed to initialize: ' + err.message);
		});
	}
}

handlers['search'] = function(args) {
	var pat = argv._[1];
	if (!pat) return console.log('No match pattern specified');

	var reg = new RegExp(pat);

	fs.readdir(path.join(homeDir, 'ajax', 'libs'), function(err, files) {
		if (err) return console.log(err.message);
		_.each(files, function(f) {
			if (reg.test(f)) console.log(f);
		});
	});
}

handlers['get'] = function(args) {
	var pat = argv._[1];
	if (!pat) return console.log('No match pattern specified');

	packageInfo(pat, function(err, info, root) {
		if (err) return console.log(err);
		var f = path.join(root, info.version, info.filename);
		fs.readFile(f, function(err, data) {
			if (err) return console.log(e.message);
			console.log(data.toString());
		});
	});
}

var findPackage = function(name, cb) {
	var p = path.join(homeDir, 'ajax', 'libs', name);
	fs.exists(p, function(e) {
		if (!e) return cb(new Error('Package: ' + name + ' does not exist'));
		cb(null, p);
	});
}

var packageInfo = function(name, cb) {
	findPackage(name, function(err, p) {
		if (err) return cb(err);
		fs.exists(path.join(p, 'package.json'), function(e) {
			if (!e) return cb(new Error('Package: ' + name + ' does not include a package.json file'));
			cb(null, require(path.join(p, 'package.json')), p);
		});
	});
}

handlers['version'] = function(args) {
	var pat = argv._[1];
	if (!pat) return console.log('No package name specified');

	packageInfo(pat, function(err, info) {
		if (err) return console.log(err);
		console.log(info["version"]);
	});
}



var help = function() {
	console.log('    init				Initialize repo (required)');
	console.log('    update				Update repo (do this once in a while)');
	console.log('    search <pattern>			Search for packages matching a certain name');
	console.log('    get <package>			Get the latest version of the package and dump it to console');
}

module.exports = function() {
	var op = argv._[0];

	if (!op) return (console.log('You need to specify the operation'), help());

	var v = handlers[op];

	var ignore = [];
	var cmd = null;

	if (_.isFunction(v)) {
		cmd = v;
	}
	else {
		ignore = v.ignore || ignore;
		cmd = v.operator;
	}

	if (cmd) {
		checkReqs(function(err) {
			if (err) return console.log(err.message);
			cmd();
		}, ignore);
	}
	else {
		console.log('Unknown command: ' + op);
	}
};
