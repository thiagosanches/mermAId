# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-04-11

### Added
- GitHub Pages deployment workflow with test requirement - only deploys when all unit tests pass
- Automated deployment on push to master branch
- CHANGELOG.md to track project changes

### Changed
- Upgraded GitHub Actions to v6 for Node.js 24 support
- Removed "Requirements Fulfilled" section from README

### Fixed
- Security vulnerabilities in dependencies (brace-expansion, path-to-regexp, picomatch)
- Node.js 20 deprecation warnings in GitHub Actions workflows

### Security
- Updated npm dependencies to address 3 vulnerabilities (1 high, 2 moderate)

## [1.0.0] - 2024-03-23

### Added
- Initial release of ez-gantt
- Working day calculations (Monday-Friday only)
- Activity-based planning with automatic end date calculation
- Smart dependency management between activities
- Milestone markers with customizable emoji/character indicators
- Today indicator on timeline
- Weekend-split visualization
- Color coding with automatic text contrast
- Weekend highlighting
- Friday→Monday logic for dependencies
- Project save/load functionality
- Week numbering with proper Sunday-Saturday boundaries
- D3.js interactive visualization
- Comprehensive unit test suite with 100+ tests
