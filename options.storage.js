var optionsKey = 'cg_client_login_option_';

function readOptions() {
    var options = {};
    return new Promise(resolve => {
        var optionKeys = ['server_options', 'default_server', 'first_name', 'last_name', 'email', 'password'];
        chrome.storage.local.get(optionKeys.map(key => optionsKey + key), function (data) {
            optionKeys.forEach(key => {
                options[key] = data[optionsKey + key];
            });
            options.server_options = options.server_options || ['dev', 'stage', 'pre_prod', 'prod'];
            options.default_server = options.default_server || 'dev';
            resolve(options);
        });
    });
}

function saveOptions(key, value) {
    chrome.storage.local.set({[optionsKey + key]: value});
}