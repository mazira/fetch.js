var
	async = require("async"),
	_ = require("lodash"),
	cp = require("child_process"),
	fs = require("fs"),
	path = require("path"),
	EOL = require("os").EOL,
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

var logError = function(msg) {
	process.stderr.write(msg + EOL);
}

var log = function(msg) {
	process.stdout.write(msg + EOL);
}

var handlers = {}

handlers['update'] = function(cb) {
	cp.exec('git fetch', { cwd: homeDir }, function(err, stdout, stderr) {
		if (err) return logError('Failed to update repo: ' + err.message);
	});
}

handlers['init'] = {
	ignore: repoExists,
	operator: function(cb) {
		log('Initializing repo, please wait ...');
		cp.exec('git clone git://github.com/cdnjs/cdnjs.git ' + homeDir, function(err, stdout, stderr) {
			if (err) return logError('Failed to initialize: ' + err.message);
		});
	}
}

handlers['search'] = function(args) {
	var pat = argv._[1];
	if (!pat) return logError('No match pattern specified');

	var reg = new RegExp(pat);

	fs.readdir(path.join(homeDir, 'ajax', 'libs'), function(err, files) {
		if (err) return log(err.message);
		_.each(files, function(f) {
			if (reg.test(f)) log(f);
		});
	});
}

handlers['get'] = function(args) {
	var pats = argv._.slice(1);
	if (_.size(pats) == 0)
		return logError('No packages specified');

	var allData = [];

	async.reduce(pats, [], function(memo, pat, cb) {
		packageInfo(pat, function(err, info, root) {
			if (err) return cb(err);
			var f = path.join(root, info.version, info.filename);
			fs.readFile(f, function(err, data) {
				if (err) return cb(err);
				return cb(null, memo.concat(data.toString()));
			});
		});
	}, function(err, result) {
		if (err) return logError(err.message);
		log(result.join(EOL));
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
	if (!pat) return logError('No package name specified');

	packageInfo(pat, function(err, info) {
		if (err) return logError(err);
		log(info["version"]);
	});
}

var help = function() {
	log('    init				Initialize repo (required)');
	log('    update				Update repo (do this once in a while)');
	log('    search <pattern>			Search for packages matching a certain name');
	log('    get <package names>		Get the latest version of the package and dump it to console');
}

module.exports = function() {
	var op = argv._[0];

	if (!op) return (logError('You need to specify the operation'), help());

	var v = handlers[op];
	if (!v) return (logError('You need to specify the operation'), help());

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
			if (err) return logError(err.message);
			cmd();
		}, ignore);
	}
	else {
		logError('Unknown command: ' + op);
	}
};
