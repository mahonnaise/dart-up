# dart-up

A command line tool for updating the Dart SDK and Dartium.

## Overview

This tool is meant to cover the most typical use case. It downloads the Dart SDK and extracts it to *dart-sdk*. By default, it also downloads Dartium and extracts it to *chromium*. Optionally, it can also download the API docs (as JSON) and extract those to *api_docs*.

Since it's primarily intended for people who frequently update Dart, it defaults to the "dev" channel. Use the `-s` or `--stable` switch if you want to get your updates from the "stable" channel.

It picks the correct archives for the current platform and architecture automatically.

## Installation

1. Install [Node.js](http://nodejs.org/) if you haven't done that already.
2. Run `npm install --global dart-up` to put the `dart-up` command in your system path, allowing it to be run from any directory.

## Usage

Before running `dart-up`, always make sure that no Dart processes are running. This includes the analysis server. Please close any editors or IDEs which are currently open before you continue.

```
Usage: dart-up [options]

Options:

  -h, --help        output usage information
  -V, --version     output the version number
  -s, --stable      use the stable channel
  -d, --docs        include docs
  -D, --no-dartium  exclude Dartium
  -f, --force       update even if the version numbers are identical

By default, dart-up uses the "dev" channel. The SDK is always downloaded.
Dartium can be excluded while the docs can be included.
```

### For Eclipse Users

If you use (or want to use) Eclipse with the Dart plugin, just run `dart-up` in the *eclipse* directory and you're good to go. Run `dart-up` before you start Eclipse whenever you want to check for updates.

## FAQ

**Q:** Why isn't `dart-up` written in Dart?  
**A:** On Windows, an executable can't be removed, renamed, or overwritten if it's currently running. The updater has to be separate from the executable it updates. So, if you want to update some runtime environment, you can't use that runtime environment for that job. A temporary copy would theoretically work, but that would make things needlessly complicated.
