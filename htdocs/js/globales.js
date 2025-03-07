"use strict";
// SPDX-License-Identifier: GPL-3.0-or-later
// myMPD (c) 2018-2022 Juergen Mang <mail@jcgames.de>
// https://github.com/jcorporation/mympd

const startTime = Date.now();
let socket = null;
let websocketConnected = false;
let websocketTimer = null;
let websocketKeepAliveTimer = null;
let searchTimer = null;
const searchTimerTimeout = 500;
let currentSong = '';
let currentSongObj = {};
let currentState = {};
let settings = {
    "loglevel": 2
};
let settingsParsed = 'no';
let progressTimer = null;
let deferredA2HSprompt;
let dragSrc;
let dragEl;
let showSyncedLyrics = false;
let scrollSyncedLyrics = true;
let appInited = false;
let scriptsInited = false;
let subdir = '';
let uiEnabled = true;
let allOutputs = null;
const ligatureMore = 'menu';
const progressBarTransition = 'width 1s linear';
const smallSpace = '\u2009';
const nDash = '\u2013';
let tagAlbumArtist = 'AlbumArtist';
const albumFilters = ["Composer", "Performer", "Conductor", "Ensemble"];
const session = {
    "token": "",
    "timeout": 0
};
const sessionLifetime = 1780;
const sessionRenewInterval = sessionLifetime * 500;
let sessionTimer = null;
const messages = [];
const debugMode = document.getElementsByTagName("script")[0].src.replace(/^.*[/]/, '') === 'combined.js' ? false : true;
let webradioDb = null;
const webradioDbPicsUri = 'https://jcorporation.github.io/webradiodb/db/pics/';
const imageExtensions = ['webp', 'png', 'jpg', 'jpeg', 'svg', 'avif'];
let locale = navigator.language || navigator.userLanguage;
let materialIcons = {};
let phrasesDefault = {};
let phrases = {};

//this settings are saved in the browsers localStorage
const localSettings = {
    "scaleRatio": "1.0",
    "localPlaybackAutoplay": false,
    "enforceMobile": false
};

//get local settings
function parseString(str) {
    return str === 'true' ? true :
           str === 'false' ? false :
           isNaN(str) ? str :
           Number(str);
}

for (const key in localSettings) {
    const value = localStorage.getItem(key);
    if (value !== null) {
        localSettings[key] = parseString(value);
    }
}

const userAgentData = {};
userAgentData.hasIO = 'IntersectionObserver' in window ? true : false;

function setUserAgentData() {
    //get interresting browser agent data
    //https://developer.mozilla.org/en-US/docs/Web/API/User-Agent_Client_Hints_API
    if (navigator.userAgentData) {
        navigator.userAgentData.getHighEntropyValues(["platform"]).then(ua => {
            userAgentData.isMobile = localSettings.enforceMobile === true ? true : ua.mobile;
            //Safari does not support this API
            userAgentData.isSafari = false;
        });
    }
    else {
        userAgentData.isMobile = localSettings.enforceMobile === true ? true : /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
        userAgentData.isSafari = /Safari/i.test(navigator.userAgent);
    }
}
setUserAgentData();

//minimum mpd version to support all myMPD features
const mpdVersion = {
    "major": 0,
    "minor": 23,
    "patch": 5
};

//remember offset for filesystem browsing uris
const browseFilesystemHistory = {};

//list of stickers
const stickerList = ['stickerPlayCount', 'stickerSkipCount', 'stickerLastPlayed',
    'stickerLastSkipped', 'stickerLike'];

//application state
const app = {};
app.cards = {
    "Home": {
        "offset": 0,
        "limit": 100,
        "filter": "-",
        "sort": {
            "tag": "-",
            "desc": false
        },
        "tag": "-",
        "search": "",
        "scrollPos": 0
    },
    "Playback": {
        "offset": 0,
        "limit": 100,
        "filter": "-",
        "sort": {
            "tag": "-",
            "desc": false
        },
        "tag": "-",
        "search": "",
        "scrollPos": 0
    },
    "Queue": {
        "active": "Current",
        "tabs": {
            "Current": {
                "offset": 0,
                "limit": 100,
                "filter": "any",
                "sort": {
                    "tag": "-",
                    "desc": false
                },
                "tag": "-",
                "search": "",
                "scrollPos": 0
            },
            "LastPlayed": {
                "offset": 0,
                "limit": 100,
                "filter": "any",
                "sort": {
                    "tag": "-",
                    "desc": false
                },
                "tag": "-",
                "search": "",
                "scrollPos": 0
            },
            "Jukebox": {
                "offset": 0,
                "limit": 100,
                "filter": "any",
                "sort": {
                    "tag": "-",
                    "desc": false
                },
                "tag": "-",
                "search": "",
                "scrollPos": 0
            }
        }
    },
    "Browse": {
        "active": "Database",
        "tabs": {
            "Filesystem": {
                "offset": 0,
                "limit": 100,
                "filter": "-",
                "sort": {
                    "tag": "-",
                    "desc": false
                },
                "tag": "dir",
                "search": "",
                "scrollPos": 0
            },
            "Playlists": {
                "active": "List",
                "views": {
                    "List": {
                        "offset": 0,
                        "limit": 100,
                        "filter": "-",
                        "sort": {
                            "tag": "-",
                            "desc": false
                        },
                        "tag": "-",
                        "search": "",
                        "scrollPos": 0
                    },
                    "Detail": {
                        "offset": 0,
                        "limit": 100,
                        "filter": "-",
                        "sort": {
                            "tag": "-",
                            "desc": false
                        },
                        "tag": "-",
                        "search": "",
                        "scrollPos": 0
                    }
                }
            },
            "Database": {
                "active": "List",
                "views": {
                    "List": {
                        "offset": 0,
                        "limit": 100,
                        "filter": "any",
                        "sort": {
                            "tag": tagAlbumArtist,
                            "desc": false
                        },
                        "tag": "Album",
                        "search": "",
                        "scrollPos": 0
                    },
                    "Detail": {
                        "offset": 0,
                        "limit": 100,
                        "filter": "-",
                        "sort": {
                            "tag": "-",
                            "desc": false
                        },
                        "tag": "-",
                        "search": "",
                        "scrollPos": 0
                    }
                }
            },
            "Radio": {
                "active": "Favorites",
                "views": {
                    "Favorites": {
                        "offset": 0,
                        "limit": 100,
                        "filter": "-",
                        "sort": {
                            "tag": "-",
                            "desc": false
                        },
                        "tag": "-",
                        "search": "",
                        "scrollPos": 0
                    },
                    "Webradiodb": {
                        "offset": 0,
                        "limit": 100,
                        "filter": {
                            "genre": "",
                            "country": "",
                            "language": "",
                            "codec": "",
                            "bitrate": ""
                        },
                        "sort": {
                            "tag": "Name",
                            "desc": false
                        },
                        "tag": "-",
                        "search": "",
                        "scrollPos": 0
                    },
                    "Radiobrowser": {
                        "offset": 0,
                        "limit": 100,
                        "filter": {
                            "tags": "",
                            "genre": "",
                            "country": "",
                            "language": ""
                        },
                        "sort": {
                            "tag": "-",
                            "desc": false
                        },
                        "tag": "-",
                        "search": "",
                        "scrollPos": 0
                    }
                }
            }
        }
    },
    "Search": {
        "offset": 0,
        "limit": 100,
        "filter": "any",
        "sort": {
            "tag": "-",
            "desc": false
        },
        "tag": "-",
        "search": "",
        "scrollPos": 0
    }
};

app.id = 'Home';
app.current = {
    "card": "Home",
    "tab": undefined,
    "view": undefined,
    "offset": 0,
    "limit": 100,
    "filter": "",
    "search": "",
    "sort": {
        "tag": "-",
        "desc": false
    },
    "tag": "",
    "scrollPos": 0
};

app.last = {
    "card": undefined,
    "tab": undefined,
    "view": undefined,
    "offset": 0,
    "limit": 100,
    "filter": "",
    "search": "",
    "sort": {
        "tag": "-",
        "desc": false
    },
    "tag": "",
    "scrollPos": 0
};
app.goto = false;

//normal settings
const settingFields = {
    "volumeMin": {
        "defaultValue": 0,
        "inputType": "input",
        "title": "Volume min.",
        "form": "volumeSettingsFrm",
        "reset": true
    },
    "volumeMax": {
        "defaultValue": 100,
        "inputType": "input",
        "title": "Volume max.",
        "form": "volumeSettingsFrm",
        "reset": true
    },
    "volumeStep": {
        "defaultValue": 5,
        "inputType": "input",
        "title": "Volume step",
        "form": "volumeSettingsFrm",
        "reset": true
    },
    "lyricsUsltExt": {
        "defaultValue": "txt",
        "inputType": "input",
        "title": "Unsynced lyrics extension",
        "form": "collapseEnableLyrics",
        "reset": true
    },
    "lyricsSyltExt": {
        "defaultValue": "lrc",
        "inputType": "input",
        "title": "Synced lyrics extension",
        "form": "collapseEnableLyrics",
        "reset": true
    },
    "lyricsVorbisUslt": {
        "defaultValue": "LYRICS",
        "inputType": "input",
        "title": "Unsynced lyrics vorbis comment",
        "form": "collapseEnableLyrics",
        "reset": true
    },
    "lyricsVorbisSylt": {
        "defaultValue": "SYNCEDLYRICS",
        "inputType": "input",
        "title": "Synced lyrics vorbis comment",
        "form": "collapseEnableLyrics",
        "reset": true
    },
    "lastPlayedCount": {
        "defaultValue": 200,
        "inputType": "input",
        "title": "Last played list count",
        "form": "statisticsFrm",
        "reset": true,
        "invalid": "Must be a number and greater than zero"
    }
};

//webui settings default values
const webuiSettingsDefault = {
    "clickSong": {
        "defaultValue": "append",
        "validValues": {
            "append": "Append to queue",
            "appendPlay": "Append to queue and play",
            "insertAfterCurrent": "Insert after current playing song",
            "replace": "Replace queue",
            "replacePlay": "Replace queue and play",
            "view": "Song details"
        },
        "inputType": "select",
        "title": "Click song",
        "form": "clickSettingsFrm"
    },
    "clickRadiobrowser": {
        "defaultValue": "append",
        "validValues": {
            "append": "Append to queue",
            "appendPlay": "Append to queue and play",
            "insertAfterCurrent": "Insert after current playing song",
            "replace": "Replace queue",
            "replacePlay": "Replace queue and play",
            "add": "Add to favorites"
        },
        "inputType": "select",
        "title": "Click webradio",
        "form": "clickSettingsFrm"
    },
    "clickRadioFavorites": {
        "defaultValue": "append",
        "validValues": {
            "append": "Append to queue",
            "appendPlay": "Append to queue and play",
            "insertAfterCurrent": "Insert after current playing song",
            "replace": "Replace queue",
            "replacePlay": "Replace queue and play",
            "edit": "Edit webradio favorite"
        },
        "inputType": "select",
        "title": "Click webradio favorite",
        "form": "clickSettingsFrm"
    },
    "clickQueueSong": {
        "defaultValue": "play",
        "validValues": {
            "play": "Play",
            "view": "Song details",
        },
        "inputType": "select",
        "title": "Click song in queue",
        "form": "clickSettingsFrm"
    },
    "clickPlaylist": {
        "defaultValue": "append",
        "validValues": {
            "append": "Append to queue",
            "appendPlay": "Append to queue and play",
            "insertAfterCurrent": "Insert after current playing song",
            "replace": "Replace queue",
            "replacePlay": "Replace queue and play",
            "view": "View playlist"
        },
        "inputType": "select",
        "title": "Click playlist",
        "form": "clickSettingsFrm"
    },
    "clickFilesystemPlaylist": {
        "defaultValue": "view",
        "validValues": {
            "append": "Append to queue",
            "appendPlay": "Append to queue and play",
            "insertAfterCurrent": "Insert after current playing song",
            "replace": "Replace queue",
            "replacePlay": "Replace queue and play",
            "view": "View playlist"
        },
        "inputType": "select",
        "title": "Click filesystem playlist",
        "form": "clickSettingsFrm"
    },
    "clickQuickPlay": {
        "defaultValue": "replacePlay",
        "validValues": {
            "append": "Append to queue",
            "appendPlay": "Append to queue and play",
            "insertAfterCurrent": "Insert after current playing song",
            "replace": "Replace queue",
            "replacePlay": "Replace queue and play"
        },
        "inputType": "select",
        "title": "Click quick play button",
        "form": "clickSettingsFrm"
    },
    "notificationAAASection": {
        "inputType": "section",
        "subtitle": "Facilities",
        "form": "NotificationSettingsAdvFrm"
    },
    "notificationPlayer": {
        "defaultValue": false,
        "inputType": "checkbox",
        "title": "Playback",
        "form": "NotificationSettingsAdvFrm"
    },
    "notificationQueue": {
        "defaultValue": true,
        "inputType": "checkbox",
        "title": "Queue",
        "form": "NotificationSettingsAdvFrm"
    },
    "notificationGeneral": {
        "defaultValue": true,
        "inputType": "checkbox",
        "title": "General",
        "form": "NotificationSettingsAdvFrm"
    },
    "notificationDatabase": {
        "defaultValue": true,
        "inputType": "checkbox",
        "title": "Database",
        "form": "NotificationSettingsAdvFrm"
    },
    "notificationPlaylist": {
        "defaultValue": true,
        "inputType": "checkbox",
        "title": "Playlist",
        "form": "NotificationSettingsAdvFrm"
    },
    "notificationScript": {
        "defaultValue": true,
        "inputType": "checkbox",
        "title": "Script",
        "form": "NotificationSettingsAdvFrm"
    },
    "notifyPage": {
        "defaultValue": true,
        "inputType": "checkbox",
        "title": "On page notifications",
        "form": "NotificationSettingsFrm"
    },
    "notifyWeb": {
        "defaultValue": false,
        "inputType": "checkbox",
        "title": "Web notifications",
        "form": "NotificationSettingsFrm",
        "onClick": "toggleBtnNotifyWeb"
    },
    "mediaSession": {
        "defaultValue": false,
        "inputType": "checkbox",
        "title": "Media session",
        "form": "NotificationSettingsFrm",
        "warn": "Browser has no MediaSession support"
    },
    "uiFooterQueueSettings": {
        "defaultValue": false,
        "inputType": "checkbox",
        "title": "Show playback settings in footer",
        "form": "footerFrm"
    },
    "uiFooterPlaybackControls": {
        "defaultValue": "pause",
        "validValues": {
            "pause": "pause only",
            "stop": "stop only",
            "both": "pause and stop"
        },
        "inputType": "select",
        "title": "Playback controls",
        "form": "footerFrm"
    },
    "uiMaxElementsPerPage": {
        "defaultValue": 100,
        "validValues": {
            "25": 25,
            "50": 50,
            "100": 100,
            "250": 250,
            "500": 500
        },
        "inputType": "select",
        "contentType": "integer",
        "title": "Elements per page",
        "form": "appearanceSettingsFrm"
    },
    "uiSmallWidthTagRows": {
        "defaultValue": true,
        "inputType": "checkbox",
        "title": "Display tags in rows for small displays",
        "form": "appearanceSettingsFrm"
    },
    "uiQuickPlayButton": {
        "defaultValue": false,
        "inputType": "checkbox",
        "title": "Quick play button",
        "form": "appearanceSettingsFrm"
    },
    "uiQuickRemoveButton": {
        "defaultValue": false,
        "inputType": "checkbox",
        "title": "Quick remove button",
        "form": "appearanceSettingsFrm"
    },
    "enableHome": {
        "defaultValue": true,
        "inputType": "checkbox",
        "title": "Homescreen",
        "form": "enableFeaturesFrm"
    },
    "enableScripting": {
        "defaultValue": true,
        "inputType": "checkbox",
        "title": "Scripting",
        "form": "enableFeaturesFrm",
        "warn": "Lua is not compiled in"
    },
    "enableTrigger": {
        "defaultValue": true,
        "inputType": "checkbox",
        "title": "Trigger",
        "form": "enableFeaturesFrm"
    },
    "enableTimer": {
        "defaultValue": true,
        "inputType": "checkbox",
        "title": "Timer",
        "form": "enableFeaturesFrm"
    },
    "enableMounts": {
        "defaultValue": true,
        "inputType": "checkbox",
        "title": "Mounts",
        "form": "enableFeaturesFrm",
        "warn": "MPD does not support mounts"
    },
    "enableLocalPlayback": {
        "defaultValue": false
    },
    "enablePartitions": {
        "defaultValue": false,
        "inputType": "checkbox",
        "title": "Partitions",
        "form": "enableFeaturesFrm",
        "warn": "MPD does not support partitions"
    },
    "enableLyrics": {
        "defaultValue": true
    },
    "uiTheme": {
        "defaultValue": "theme-dark",
        "validValues": {
            "theme-autodetect": "Autodetect",
            "theme-dark": "Dark",
            "theme-light": "Light"
        },
        "inputType": "select",
        "title": "Theme",
        "form": "themeFrm",
        "onChange": "eventChangeTheme"
    },
    "uiHighlightColor": {
        "defaultValue": "#28a745",
        "inputType": "color",
        "title": "Highlight color",
        "form": "themeFrm",
        "reset": true
    },
    "uiThumbnailSize": {
        "defaultValue": 175,
        "inputType": "input",
        "contentType": "integer",
        "title": "Thumbnail size",
        "form": "coverimageFrm",
        "reset": true
    },
    "uiBgColor": {
        "defaultValue": "#060708",
        "inputType": "color",
        "title": "Color",
        "form": "bgFrm",
        "reset": true
    },
    "uiBgImage": {
        "defaultValue": "",
        "inputType": "mympd-select-search",
        "cbCallback": "filterImageSelect",
        "title": "Image",
        "form": "bgFrm"
    },
    "uiBgCover": {
        "defaultValue": true,
        "inputType": "checkbox",
        "title": "Albumart",
        "form": "bgFrm"
    },
    "uiBgCssFilter": {
        "defaultValue": "grayscale(100%) opacity(20%)",
        "inputType": "input",
        "title": "CSS filter",
        "form": "bgFrm",
        "reset": true
    },
    "uiLocale": {
        "defaultValue": "default",
        "inputType": "select",
        "title": "Locale",
        "form": "localeFrm",
        "onChange": "eventChangeLocale"
    },
    "uiStartupView": {
        "defaultValue": null,
        "validValues": {
            "Home": "Home",
            "Playback": "Playback",
            "Queue/Current": "Queue",
            "Queue/LastPlayed": "LastPlayed",
            "Queue/Jukebox": "Jukebox Queue",
            "Browse/Database": "Database",
            "Browse/Playlists": "Playlists",
            "Browse/Filesystem": "Filesystem",
            "Browse/Radio": "Radio Favorites",
            "Search": "Search"
        },
        "inputType": "select",
        "title": "Startup view",
        "form": "startupFrm",
        "onChange": "eventChangeTheme"
    }
};

//features
const features = {
    "featCacert": false,
    "featHome": true,
    "featLibrary": false,
    "featLocalPlayback": false,
    "featLyrics": false,
    "featMounts": true,
    "featNeighbors": true,
    "featPartitions": true,
    "featPlaylists": true,
    "featScripting": true,
    "featSmartpls": true,
    "featStickers": false,
    "featTags": true,
    "featTimer": true,
    "featTrigger": true,
    "featBinarylimit": true,
    "featFingerprint": false
};

//keyboard shortcuts
const keymap = {
    "playback": {"order": 0, "desc": "Playback"},
        " ": {"order": 1, "cmd": "clickPlay", "options": [], "desc": "Toggle play / pause", "key": "space_bar"},
        "s": {"order": 2, "cmd": "clickStop", "options": [], "desc": "Stop playing"},
        "ArrowLeft": {"order": 3, "cmd": "clickPrev", "options": [], "desc": "Previous song", "key": "keyboard_arrow_left"},
        "ArrowRight": {"order": 4, "cmd": "clickNext", "options": [], "desc": "Next song", "key": "keyboard_arrow_right"},
        "-": {"order": 5, "cmd": "volumeStep", "options": ["down"], "desc": "Volume down"},
        "+": {"order": 6, "cmd": "volumeStep", "options": ["up"], "desc": "Volume up"},
        "r": {"order": 7, "cmd": "togglePlaymode", "options": ["random"], "desc": "Toggle random"},
        "c": {"order": 8, "cmd": "togglePlaymode", "options": ["consume"], "desc": "Toggle consume"},
        "p": {"order": 9, "cmd": "togglePlaymode", "options": ["repeat"], "desc": "Toggle repeat"},
        "i": {"order": 9, "cmd": "togglePlaymode", "options": ["single"], "desc": "Switch single mode"},
    "update": {"order": 100, "desc": "Update"},
        "U": {"order": 101, "cmd": "updateDB", "options": ["", true, false], "desc": "Update database"},
        "R": {"order": 102, "cmd": "updateDB", "options": ["", true, true], "desc": "Rescan database"},
        "P": {"order": 103, "cmd": "updateSmartPlaylists", "options": [false], "desc": "Update smart playlists", "req": "featSmartpls"},
    "modals": {"order": 200, "desc": "Dialogs"},
        "A": {"order": 201, "cmd": "showAddToPlaylist", "options": ["STREAM"], "desc": "Add stream"},
        "C": {"order": 202, "cmd": "openModal", "options": ["modalConnection"], "desc": "Open MPD connection"},
        "Q": {"order": 203, "cmd": "openModal", "options": ["modalQueueSettings"], "desc": "Open queue settings"},
        "T": {"order": 204, "cmd": "openModal", "options": ["modalSettings"], "desc": "Open settings"},
        "M": {"order": 205, "cmd": "openModal", "options": ["modalMaintenance"], "desc": "Open maintenance"},
        "?": {"order": 206, "cmd": "openModal", "options": ["modalAbout"], "desc": "Open about"},
    "navigation": {"order": 300, "desc": "Navigation"},
        "0": {"order": 301, "cmd": "appGoto", "options": ["Home"], "desc": "Show home"},
        "1": {"order": 302, "cmd": "appGoto", "options": ["Playback"], "desc": "Show playback"},
        "2": {"order": 303, "cmd": "appGoto", "options": ["Queue", "Current"], "desc": "Show queue"},
        "3": {"order": 304, "cmd": "appGoto", "options": ["Queue", "LastPlayed"], "desc": "Show last played"},
        "4": {"order": 305, "cmd": "appGoto", "options": ["Queue", "Jukebox"], "desc": "Show jukebox queue"},
        "5": {"order": 306, "cmd": "appGoto", "options": ["Browse", "Database"], "desc": "Show browse database", "req": "featTags"},
        "6": {"order": 307, "cmd": "appGoto", "options": ["Browse", "Playlists"], "desc": "Show browse playlists", "req": "featPlaylists"},
        "7": {"order": 308, "cmd": "appGoto", "options": ["Browse", "Filesystem"], "desc": "Show browse filesystem"},
        "8": {"order": 308, "cmd": "appGoto", "options": ["Browse", "Radio"], "desc": "Show browse webradio"},
        "9": {"order": 309, "cmd": "appGoto", "options": ["Search"], "desc": "Show search"},
        "/": {"order": 310, "cmd": "focusSearch", "options": [], "desc": "Focus search"}
};

//cache often accessed dom elements
const domCache = {};
domCache.body = document.getElementsByTagName('body')[0];
domCache.counter = document.getElementById('counter');
domCache.progress = document.getElementById('footerProgress');
domCache.progressBar = document.getElementById('footerProgressBar');
domCache.progressPos = document.getElementById('footerProgressPos');
domCache.notificationCount = document.getElementById('notificationCount');

//Get BSN object references for fast access
const uiElements = {};
//all modals
for (const m of document.getElementsByClassName('modal')) {
    uiElements[m.id] = BSN.Modal.getInstance(m);
}
//other directly accessed BSN objects
uiElements.dropdownHomeIconLigature = BSN.Dropdown.getInstance(document.getElementById('btnHomeIconLigature'));
uiElements.collapseJukeboxMode = BSN.Collapse.getInstance(document.getElementById('collapseJukeboxMode'));

const LUAfunctions = {
    "mympd_api_http_client": {
        "desc": "HTTP client",
        "func": "rc, response, header, body = mympd_api_http_client(method, uri, headers, payload)"
    },
    "mympd.init": {
        "desc": "Initializes the mympd_state lua table",
        "func": "mympd.init()"
    },
    "mympd.os_capture": {
        "desc":	"Executes a system command and capture its output.",
        "func": "output = mympd.os_capture(command)"
    }
};

const typeFriendly = {
    'plist': 'Playlist',
    'smartpls': 'Smart playlist',
    'dir': 'Directory',
    'song': 'Song',
    'search': 'Search',
    'album': 'Album',
    'stream': 'Stream',
    'view': 'View',
    'script': 'Script',
    'webradio': 'Webradio',
    'externalLink': 'External link'
};

const friendlyActions = {
    'replaceQueue': 'Replace queue',
    'replacePlayQueue': 'Replace queue and play',
    'insertAfterCurrentQueue': 'Insert after current playing song',
    'appendQueue': 'Append to queue',
    'appendPlayQueue': 'Append to queue and play',
    'replaceQueueAlbum': 'Replace queue',
    'replacePlayQueueAlbum': 'Replace queue and play',
    'insertAfterCurrentQueueAlbum': 'Insert after current playing song',
    'appendQueueAlbum': 'Append to queue',
    'appendPlayQueueAlbum': 'Append to queue and play',
    'appGoto': 'Goto view',
    'homeIconGoto': 'Show',
    'execScriptFromOptions': 'Execute script',
    'openExternalLink': 'Open external link'
};

const bgImageValues = [
    {"value": "", "text": "None"},
    {"value": "/assets/mympd-background-dark.svg", "text": "Default image dark"},
    {"value": "/assets/mympd-background-light.svg", "text": "Default image light"}
];
