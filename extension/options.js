// from https://github.com/parshap/node-sanitize-filename/
var illegalRe = /[\/\?<>\\:\*\|":]/;
var controlRe = /[\x00-\x1f\x80-\x9f]/;
var reservedRe = /^\.+$/;
var windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
var windowsTrailingRe = /[\. ]+$/;

var unixRe = /[\/]/;
var unixdotsRe = /^\.|\.\.$/;

var invalidMatcher;

chrome.runtime.getPlatformInfo(function (info) {
    if (info.os === "win") {
        invalidMatcher = function (value) {
            return (value.match(illegalRe) || value.match(controlRe)
                || value.match(reservedRe) || value.match(windowsReservedRe)
                || value.match(windowsTrailingRe));
        }
    } else {
        invalidMatcher = function (value) {
            return (value.match(unixRe) || value.match(unixdotsRe));
        }
    }
});

function checkDirectory(inputNode) {
    if (!invalidMatcher(inputNode.value)) {
        return true;
    } else {
        var errorNode = document.getElementById("error");
        errorNode.textContent = "Invalid directory found: \""
            + inputNode.value + "\"!";
        inputNode.focus();
        setTimeout(function () {
            errorNode.textContent = "";
        }, 2750);
        return false;
    }
}

// Restores select box and text fields
function restoreOptions() {
    try {
        browser.runtime.getBrowserInfo(function (info) {
            if (info.vendor != "Mozilla") {
                document.getElementById("non-mozilla").hidden = false;
            }
        });
    } catch (e) {
        document.getElementById("non-mozilla").hidden = false;
    }

    chrome.storage.local.get({
        "twc-root-dir": "TiddlyWiki Classic",
        "tw5-root-dir": "TiddlyWiki",
        "tw5-saves-backup": true,
        "tw5-backup-dir": "Backup",
        "shows-warning": true
    }, function (items) {
        document.getElementById("twc-root-dir").value
            = items["twc-root-dir"];
        document.getElementById("tw5-root-dir").value
            = items["tw5-root-dir"];
        document.getElementById("tw5-saves-backup").checked
            = items["tw5-saves-backup"];
        document.getElementById("tw5-backup-dir").value
            = items["tw5-backup-dir"];
        document.getElementById("shows-warning").checked
            = items["shows-warning"];
    });
}

// Saves options to chrome.storage.sync.
function saveOptions() {
    if (!checkDirectory(document.getElementById("twc-root-dir"))) return;
    if (!checkDirectory(document.getElementById("tw5-root-dir"))) return;
    if (!checkDirectory(document.getElementById("tw5-backup-dir"))) return;
    chrome.storage.local.set({
        "twc-root-dir": document.getElementById("twc-root-dir").value,
        "tw5-root-dir": document.getElementById("tw5-root-dir").value,
        "tw5-saves-backup": document.getElementById("tw5-saves-backup").checked,
        "tw5-backup-dir": document.getElementById("tw5-backup-dir").value,
        "shows-warning": document.getElementById("shows-warning").checked
    }, function () {
        // Update status to let user know options were saved.
        var statusNode = document.getElementById("status");
        statusNode.textContent = "Options saved.";
        setTimeout(function () {
            statusNode.textContent = "";
        }, 750);
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);
