# TiddlyWiki Mate - Yet another TiddlyWiki saving plugin

## Origin

This plugin derives from *savetiddlers* ([buggyj/savetiddlers](https://github.com/buggyj/savetiddlers)). Although the original plugin worked well for TiddlyWiki classic for a while, it did not support TiddlyWiki classic any longer. Specifically, version 0.8 does not help saving TiddlyWiki classic at all.

There are still a lot of people who manage their notes with [TiddlyWiki classic](https://classic.tiddlywiki.com/), an actively maintained browser plugin is valuable to many. TiddlyWiki Mate is built based upon *savetiddlers* and is more stable and friendly to TiddlyWiki classic.

## Getting started for FireFox

1. Install (TBD)
1. In the download folder of Firefox (you can see and change this location in FireFox's preferences), create a sub-directory where to put your TiddlyWiki classic files. 
1. Config the plugin like the following:
   * Settings for TiddlyWiki Classic:
      * Root directory: **TiddlyWiki Classic** (The sub-directory you use.)
   * Settings for TiddlyWiki:
      * Root directory: **TiddlyWiki** (The sub-directory you use. You can use different root directory for TiddlyWiki and TiddlyWiki classic.)
      * Save backups: *checked* (Saves backups if checked.)
      * Backup sub-directory: **Backup** (The sub-directory in the *root directory* where to save backup.)
   * Location warning message: *checked* (Pops up useful information on error if  checked.)

## Scope and limitations

1. This is a browser extension designed to work with chrome and other chromium based browsers, and the new firefox browser (v57 and latter).
1. Due to browser restrictions tiddlywikis must be located below a sub-directory of the browser's download directory.

