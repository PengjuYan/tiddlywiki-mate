/*
 * parts of this file is from https github.com/Jermolene/TiddlyWiki5
 * which is licensed under the BSD format copyright Jermolene Ruston
 */
document.addEventListener('DOMContentLoaded', injectMessageBox, false);

var otherSaverSnippet1 = "TiddlyWiki Mate has detected another "
    + "TiddlyFox-like saver called ";
var otherSaverSnippet2 = ". Currently only one saver is supported, "
    + "therefore TiddlyWiki Mate will not activate.";
var pathErrorMessage = "Automatic saving not possible.\n\n"
    + "As your TiddlyWiki is not within the contolled directory, "
    + "a manual save is required.";
var trialErrorMessage = "Automatic saving not possible.\n\n"
    + "Saving to the relative directory in the system download directory was "
    + "not successful.";
var saveAsMessage = "Your TiddlyWiki has been saved to a new location: ";
var finalSaveErrorMessage = "Sorry, but your TiddlyWiki ws not saved "
    + "successfully for some reason!\n\nYou'll have to do something else "
    + "to save your work.";

var isTiddlyWiki = true;

function isTiddlyWikiClassic() {
    // Test whether the document is a TiddlyWiki
    // (we don't have access to JS objects in it)
    var versionArea = document.getElementById("versionArea");
    return (document.location.protocol === "file:")
        && document.getElementById("storeArea")
        && (versionArea && /TiddlyWiki/.test(versionArea.text));
}

function injectMessageBox(event) {
    if (isTiddlyWikiClassic()) {
        var scriptNode = document.createElement('script');
        scriptNode.src = chrome.extension.getURL('script.js');
        (document.head || document.documentElement).appendChild(scriptNode);
        scriptNode.onload = function () {
            scriptNode.parentNode.removeChild(scriptNode);
        };
        isTiddlyWiki = false;
    }

    // Inject the message box
    var messageBox = document.getElementById("tiddlyfox-message-box");
    if (messageBox) {
        var otherCreator = messageBox.getAttribute("data-message-box-creator")
            || null;
        if (otherCreator) {
            alert(otherSaverSnippet1 + "\"" + otherCreator
                + "\"" + otherSaverSnippet2);
            return;
        } else {
            messageBox.setAttribute("data-message-box-creator",
                "TiddlyWiki Mate");
        }
    } else {
        messageBox = document.createElement("div");
        messageBox.id = "tiddlyfox-message-box";
        messageBox.style.display = "none";
        messageBox.setAttribute("data-message-box-creator", "TiddlyWiki Mate");
        document.body.appendChild(messageBox);
    }

    // Attach the event handler to the message box
    messageBox.addEventListener("tiddlyfox-save-file", saveFileListener, false);
}

function saveFileListener(event) {
    // Get the details from the message
    var messageInfo = event.target,
        path = messageInfo.getAttribute("data-tiddlyfox-path"),
        content = messageInfo.getAttribute("data-tiddlyfox-content");
    // Remove the message info element from the message box
    messageInfo.parentNode.removeChild(messageInfo);

    // Save the file
    sendBackgroundAutoSaveCommand(path, content, function (response) {
        // Send a confirmation message
        logAutoSaveResponse(response);
        if (response.status === "auto-saved") {
            notifyTiddlyWiki(messageInfo, path);
        } else {
            onAutoSaveFailed(messageInfo, path, content, response);
        }
    });
    return false;
}

function onAutoSaveFailed(messageInfo, path, content, autoSaveResponse) {
    chrome.storage.local.get({ "shows-warning": true }, function (items) {
        console.log("twmate: auto-save failure");
        if (items["shows-warning"]) {
            if (autoSaveResponse.status === "root-dir-not-found"
                || autoSaveResponse.status === "incompatible-root") {
                alert(pathErrorMessage);
            } else if (autoSaveResponse.status === "trial-save-error") {
                alert(trialErrorMessage);
            }
        }
        sendBackgroundManualSaveCommand(path, content, function (response) {
            // from saveAs
            logManualSaveResponse(response);
            if (response.status === "manual-saved") {
                if (response.path) {
                    alert(saveAsMessage + response.path + ".");
                }
                notifyTiddlyWiki(messageInfo, path);
            } else {
                console.log("twmate: manual-save failure");
                alert(finalSaveErrorMessage);
            }
        })
    })
}

function notifyTiddlyWiki(messageInfo, path) {
    // TiddlyFoxSaver in TiddlyWiki expects to receive this message

    var event = document.createEvent("Events");
    event.initEvent("tiddlyfox-have-saved-file", true, false);
    event.savedFilePath = path;
    console.log("twmate: saved message sent for " + path);
    messageInfo.dispatchEvent(event);
}

function logAutoSaveResponse(response) {
    function addPath(message, pathName, path) {
        return message + ", " + pathName + " = \"" + path + "\"";
    }

    var message = "twmate: auto-save response is " + response.status;;
    if (response.status === "auto-saved") {
        message = addPath(message, "path", response.path);
    } else if (response.status === "root-dir-not-found") {
        message = addPath(message, "root", response.root);
        message = addPath(message, "path", response.path);
    } else if (response.status === "incompatible-root") {
        message = addPath(message, "root", response.root);
        message = addPath(message, "downloadsDir", response.downloadsDir);
    } else if (response.status === "trial-save-error") {
        message += ", path = " + response.path;
    }
    console.log(message);
}

function logManualSaveResponse(response) {
    function addPath(message, pathName, path) {
        return message + ", " + pathName + " = \"" + path + "\"";
    }

    var message = "twmate: manual-save response is " + response.status;;
    if (response.status === "manual-saved") {
        message = addPath(message, "path", response.path);
    } else if (response.status === "manual-save-cancelled") {
        message = addPath(message, "path", response.path);
    } else if (response.status === "manual-save-interrupted") {
        message = addPath(message, "path", response.path);
    } else if (response.status === "manual-save-error") {
        message = addPath(message, "path", response.path);
    }
    console.log(message);
}

function sendBackgroundAutoSaveCommand(path, content, callback) {
    try {
        var command = {};
        command.path = path;
        command.content = content;
        command.type = "auto-save";
        command.isTiddlyWiki = isTiddlyWiki;
        console.log("twmate: auto-save command sent for " + command.path);
        chrome.runtime.sendMessage(command, callback);
        return true;
    } catch (e) {
        alert(e);
        return false;
    }
}

function sendBackgroundManualSaveCommand(path, content, callback) {
    try {
        var command = {};
        command.path = path;
        command.content = content;
        command.type = "manual-save"
        command.isTiddlyWiki = isTiddlyWiki;
        console.log("twmate: manual-save command sent for " + command.path);
        chrome.runtime.sendMessage(command, callback);
        return true;
    } catch (e) {
        alert(e);
        return false;
    }
}
