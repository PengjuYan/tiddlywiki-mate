var slash = { "/": "/" };

var dummyContent = "This is a test file for TiddlyWiki Mate extension";

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

String.zeroPad = function (number, width) {
    var string = number.toString();
    if (string.length < width)
        string = "000000000000000000000000000".substr(0, width - string.length)
            + string;
    return string;
};

Date.prototype.convertToYYYYMMDDHHMMSSMMM = function () {
    return this.getUTCFullYear()
        + String.zeroPad(this.getUTCMonth() + 1, 2)
        + String.zeroPad(this.getUTCDate(), 2) + "."
        + String.zeroPad(this.getUTCHours(), 2)
        + String.zeroPad(this.getUTCMinutes(), 2)
        + String.zeroPad(this.getUTCSeconds(), 2)
        + String.zeroPad(this.getUTCMilliseconds(), 3) + "0";
};

var isWindows = false;
chrome.runtime.getPlatformInfo(function (info) {
    if (info.os == "win") {
        slash["/"] = "\\";
        isWindows = true;
    }
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "auto-save") {
        // auto-save handling
        console.log("twmate: auto-save message received");
        chrome.storage.local.get({
            "twc-root-dir": "TiddlyWiki Classic",
            "tw5-root-dir": "TiddlyWiki",
            "tw5-saves-backup": true,
            "tw5-backup-dir": "Backup",
            "shows-warning": true
        }, function (config) {
            findRootDir(message, config);
            var rootDirPosition = message.path.indexOf(
                slash["/"] + message.rootDir + slash["/"]);
            if (rootDirPosition === -1) {
                console.log("twmate: root dir " + message.rootDir
                    + " not found in path " + message.path);
                sendResponse({
                    status: "root-dir-not-found",
                    root: message.rootDir,
                    path: message.path
                });
            } else {
                message.downloadsDir = message.path.substring(
                    0, rootDirPosition);
                message.relativePath = message.path.slice(rootDirPosition
                    + slash["/"].length + message.rootDir.length
                    + slash["/"].length);
                trySaveDummyThenSave(message, sendResponse);
            }
        });
        console.log("twmate: auto-save message processed");
    } else if (message.type === "manual-save") {
        // manual-save handling
        console.log("twmate: manual-save message received");
        chrome.storage.local.get({
            "twc-root-dir": "TiddlyWiki Classic",
            "tw5-root-dir": "TiddlyWiki",
            "tw5-saves-backup": true,
            "tw5-backup-dir": "Backup",
            "shows-warning": true
        }, function (config) {
            findRootDir(message, config);
            var randomDigits = String.zeroPad(getRandomInt(0, 99999999), 8);
            message.relativePath = "tiddlywiki" + "." + randomDigits + '.html';
            manualSave(message, sendResponse)
        });
        console.log("twmate: manual-save message processed");
    } else {
        console.log("twmate: unknown message received");
    }
    return true;
});

function trySaveDummyThenSave(message, sendResponse) {
    // check our destination is valid by downloading a dummy file first
    // and then reading back the filepath

    var dummyNameTrunk = message.rootDir + slash["/"],
        slashPosition = message.relativePath.lastIndexOf(slash["/"]);
    if (slashPosition === -1) {
        dummyNameTrunk += 'dummy';
    } else {
        dummyNameTrunk += message.relativePath.slice(0, slashPosition + 1)
            + 'dummy';
    }
    var randomDigits = String.zeroPad(getRandomInt(0, 99999999), 8);
    var fileName = dummyNameTrunk + "." + randomDigits + '.html';

    chrome.downloads.download({
        url: URL.createObjectURL(new Blob([dummyContent],
            { type: 'text/plain' })),
        filename: fileName,
        conflictAction: 'overwrite'
    }, function (id) {
        chrome.downloads.onChanged.addListener(function listener(delta) {
            if (delta.id != id) return;
            if (delta.error) {
                chrome.downloads.onChanged.removeListener(listener);
                console.log("twmate: trying to save in "
                    + fileName + " failed");
                sendResponse({ status: "trial-save-error", path: fileName });
                return;
            }
            // wait for completion
            if (delta.state && delta.state.current === "complete") {
                chrome.downloads.onChanged.removeListener(listener);
                chrome.downloads.search({ id: id }, function (results) {
                    if (compareDummyDownloadsDir(message, results,
                        dummyNameTrunk)) {
                        // All tests passed!
                        console.log("twmate: dummy save succeeded");
                        autoSave(message, sendResponse);
                    } else {
                        var downloadsDir = message.downloadsDir + slash["/"]
                            + message.rootDir;
                        console.log("twmate: root dir " + message.rootDir
                            + " incompatible with downloadsdir "
                            + downloadsDir);
                        sendResponse({
                            status: "incompatible-root",
                            root: message.rootDir,
                            downloadsDir: downloadsDir
                        });
                    }
                    // remove this further up
                    chrome.downloads.removeFile(id,
                        function () { chrome.downloads.erase({ id: id }) });
                });
                return;
            }
        })
    })
}

function autoSave(message, sendResponse) {
    // filename must not be an absolute path
    var fileName = message.rootDir + slash["/"] + message.relativePath;

    chrome.downloads.download({
        url: URL.createObjectURL(new Blob([message.content],
            { type: 'text/plain' })),
        filename: fileName,
        conflictAction: 'overwrite'
    }, function (id) {
        console.log("twmate: saved " + message.relativePath);
        sendResponse({ status: "auto-saved", path: fileName });

        // use its intrinsic backup settings if it's a classic tiddlywiki
        if (!message.isTiddlyWiki) return;

        chrome.storage.local.get({
            "tw5-saves-backup": true,
            "tw5-backup-dir": "Backup"
        }, function (items) {
            console.log("===pengju: backup path " + message.downloadsDir + slash["/"]
                + items["tw5-backup-dir"] + slash["/"]
                + message.relativePath.replace(new RegExp('.{' + message.relativePath.lastIndexOf(".") + '}'), '$&.' + (new Date()).convertToYYYYMMDDHHMMSSMMM()));
            chrome.downloads.download({
                url: URL.createObjectURL(new Blob([message.content], { type: 'text/plain' })),
                // filename: tiddlywikilocations + slash["/"] + items.backupdir + slash["/"] + msg.relativePath.replace(new RegExp('.{' + msg.relativePath.lastIndexOf(".") + '}'), '$&' + bkdate),
                filename: tiddlywikilocations + slash["/"] + items.backupdir + slash["/"] + message.relativePath.replace(new RegExp('.{' + message.relativePath.lastIndexOf(".") + '}'), '$&' + bkdate),
                conflictAction: 'overwrite'
            }, function (id) { sendResponse({ status: "backupsaved" }); });
            console.log("twmate: backedup " + message.relativePath);
            chrome.storage.local.set(newvals);
        });
    });
}

function manualSave(message, sendResponse) {
    // save the file into the specified root dir in the system download
    // directory

    // filename must not be an absolute path
    var fileName = message.rootDir + slash["/"] + message.relativePath;

    chrome.downloads.download({
        url: URL.createObjectURL(new Blob([message.content],
            { type: 'text/plain' })),
        filename: fileName,
        saveAs: true
    }, function (id) {
        if (id === undefined) {
            sendResponse({
                status: "manual-save-cancelled", path: fileName
            });
            // just to check the error to make the debugger happy
            console.log("twmate: " + browser.runtime.lastError);
            console.log("twmate: manual save cancelled");
            return true;
        }
        chrome.downloads.onChanged.addListener(function listener(delta) {
            if (delta.id != id) return;
            if (delta.error) {
                chrome.downloads.onChanged.removeListener(listener);
                console.log("twmate: trying to save in "
                    + fileName + " failed");
                sendResponse({ status: "manual-save-error", path: fileName });
                return;
            }
            if (delta.state && delta.state.current === "interrupted") {
                chrome.downloads.onChanged.removeListener(listener);
                sendResponse({
                    status: "manual-save-interrupted", path: fileName
                });
                console.log("twmate: manual save interrupted");
                return;
            }
            // wait for completion
            if (delta.state && delta.state.current === "complete") {
                chrome.downloads.onChanged.removeListener(listener);
                chrome.downloads.search({ id: id }, function (results) {
                    var filePath = results[0].filename;
                    if (isWindows) { // make drive letters the same case
                        filePath = filePath.replace(/^./g,
                            filePath[0].toLowerCase());
                    }
                    console.log("twmate: saved as path " + filePath);
                    sendResponse({ status: "manual-saved", path: filePath });
                    return true;
                });
                return;
            }
        });
    });
}

function findRootDir(message, config) {
    if (message.isTiddlyWiki) {
        message.rootDir = config["tw5-root-dir"]
    } else {
        message.rootDir = config["twc-root-dir"]
    }
}

function compareDummyDownloadsDir(message, searchResults, dummyNameTrunk) {
    var dirx = searchResults[0].filename.split(
        slash["/"] + dummyNameTrunk)[0],
        diry = message.downloadsDir;
    if (isWindows) { // make drive letters the same case
        dirx = dirx.replace(/^./g, dirx[0].toLowerCase());
        diry = diry.replace(/^./g, diry[0].toLowerCase());
    }
    if (dirx === diry) {
        return true;
    } else {
        return false;
    }
}
