chrome.runtime.onInstalled.addListener(function () {

    let imgFolder = `images/${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'white' : 'blue'}/`;

    chrome.browserAction.setIcon({
        path: {
            '16': imgFolder + 'cleargov-logo-icon-16.png',
            '32': imgFolder + 'cleargov-logo-icon-32.png',
            '48': imgFolder + 'cleargov-logo-icon-48.png',
            '128': imgFolder + 'cleargov-logo-icon-128.png'
        }
    });


});