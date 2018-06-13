# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased-TODO]
- fix README
- add more features
- add tests for multiple matches, logging of errors
## 0.1.3 - 2018-06-12
### Added
- added src/graphparser.js

### Changed
- switched to standard style (all src files)
- added tests for graphparser.js to test.js
- adjusted package.json with tests for standard
- webpack.config.js - added library parameters (for client-side), outputting
  as urdubiometer.js and urdubiometer.node.js

### Deleted
- .eslintrc.json

## 0.1.2 - 2018-06-12
### Added
- added src, dist directories;
- added webpack.config.js

### Changed
- added build to package.json

### Renamed
- index.js to src/index.js.

## 0.1.1 - 2018-06-12
### Added
- added index.js, package.json, LICENSE, CHANGELOG.md, README.md, .eslintrc.json
- continuous integration with travis and coverall, eslint with StrongLoop style
