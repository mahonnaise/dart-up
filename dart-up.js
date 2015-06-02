#! /usr/bin/env node

'use strict';

var https = require('https');
var fs = require('fs');
var path = require('path');
var AdmZip = require('adm-zip');
var program = require('commander');

function checkPlatform() {
	var platforms = ['darwin', 'linux', 'win32'];
	if (platforms.indexOf(process.platform) === -1) {
		throw 'Platform (' + process.platform + ') not supported!';
	}
}

function checkArch() {
	var architectures = ['x64', 'ia32'];
	if (architectures.indexOf(process.arch) === -1) {
		throw 'Architecture (' + process.arch + ') not supported!';
	}
}

function getUrl(version, thing) {
	var channel = program.stable ? 'stable' : 'dev';
	var parts = [];
	parts.push({
		sdk: 'sdk/dartsdk',
		dartium: 'dartium/dartium',
		docs: 'api-docs/dart-api-docs'
	}[thing]);
	if (thing !== 'docs') {
		// current platform
		var platform = {
			darwin: 'macos',
			linux: 'linux',
			win32: 'windows'
		}[process.platform];
		parts.push(platform);

		// current arch
		var arch = process.arch;
		if (thing === 'dartium' && (platform === 'windows' || platform === 'macos')) {
			// there are no 64bit versions of Dartium for Windows or Mac OS
			arch = 'ia32';
		}
		parts.push(arch);

		parts.push('release');
	}
	return 'https://storage.googleapis.com/dart-archive/channels/' + channel + '/release/' + version + '/' + parts.join('-') + '.zip';
}

function fetchRemoteVersion() {
	var channel = program.stable ? 'stable' : 'dev';
	var versionUrl = 'https://storage.googleapis.com/dart-archive/channels/' + channel + '/release/latest/VERSION';
	return new Promise(function(resolve, reject) {
		https.get(versionUrl, function(response) {
			var json = '';
			response.on('data', function(data) {
				json += data;
			});
			response.on('end', function() {
				resolve(JSON.parse(json));
			});
			response.on('error', function(e) {
				reject(e.message);
			});
		});
	});
}

function fetchLocalVersion() {
	return new Promise(function(resolve, reject) {
		fs.readFile('.dart-up', function(err, data) {
			if (err) {
				resolve({});
			} else {
				resolve(JSON.parse(data));
			}
		});
	});
}

function download(url, fileName) {
	return new Promise(function(resolve, reject) {
		var file = fs.createWriteStream(fileName);
		https.get(url, function(response) {
			response.pipe(file);
			file.on('finish', function() {
				file.close(function(){
					resolve(true);
				});
			});
		});
	});
}

function downloadAndExtract(url) {
	var fileName = url.split('/').pop(); // XXX: use os.tmpdir()?
	console.log('[' + fileName + '] started');
	return new Promise(function(resolve, reject) {
		download(url, fileName).then(function() {
			console.log('[' + fileName + '] done');
			try {
				var zip = new AdmZip(fileName);
				// Special case for Dartium.
				// We need to put the stuff from the "dartium-xxx-full-dev-xxx" directory into "chromium".
				if (fileName.indexOf('dartium') !== -1) {
					var entry = zip.getEntries()[0];
					zip.extractEntryTo(entry.entryName, 'chromium', /*maintainEntryPath*/false, /*overwrite*/true);
				} else {
					zip.extractAllTo('', /*overwrite*/true);
				}
				resolve(true);
			} catch(e) {
				reject(e);
			}
		});
	});
}

function getPackageVersion() {
	return JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'))).version;
}

(function main() {
	checkPlatform();
	checkArch();

	program
		.version(getPackageVersion())
		.option('-s, --stable', 'use the stable channel')
		.option('-d, --docs', 'include docs')
		.option('-D, --no-dartium', 'exclude Dartium')
		.option('-f, --force', 'update even if the version numbers are identical');

	program.on('--help', function() {
		console.log('  By default, dart-up uses the "dev" channel. The SDK is always downloaded. ');
		console.log('  Dartium can be excluded while the docs can be included.');
	});

	program.parse(process.argv);

	Promise.all([fetchLocalVersion(), fetchRemoteVersion()]).then(function(versions) {
		var local = versions[0];
		var remote = versions[1];

		if (local.revision === remote.revision && !program.force) {
			console.log(local.version + ' (' + local.revision + ') is already installed.');
			console.log('Nothing to update.');
		} else {
			if (local.version) {
				console.log('Updating [' + local.version + '] to [' + remote.version + '].');
			} else {
				console.log('Installing [' + remote.version + '].');
			}

			var tools = ['sdk'];
			if (program.dartium) {
				tools.push('dartium');
			}
			if (program.docs) {
				tools.push('docs');
			}

			Promise.all(
				tools
					.map(getUrl.bind(null, remote.version))
					.map(downloadAndExtract)
			).then(function() {
				fs.writeFileSync('.dart-up', JSON.stringify(remote));
				console.log('[' + tools.join(', ') + '] successfully updated!');
			}).catch(function(e) {
				console.log(e);
			});
		}
	});
}());
