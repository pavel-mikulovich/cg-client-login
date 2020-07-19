var options = null;
var environments = [
    {id: 'dev', name: 'Dev'},
    {id: 'stage', name: 'Stage'},
    {id: 'pre_prod', name: 'Pre-prod'},
    {id: 'prod', name: 'Prod'},
];

init();

function init() {
    bindEvents();
    return readOptions()
        .then(applyOptions);

    function applyOptions(data) {
        options = data;
        applyCheckboxes();
        applySelect();
        applyText('first_name');
        applyText('last_name');
        applyText('email');
        applyText('password');

        function applyCheckboxes() {
            options.server_options.forEach(x => {
                var element = document.getElementById('server_' + x);
                if (!element) return;
                element.checked = true;
            });
        }

        function applyText(key) {
            var element = document.getElementById(key);
            if (!element) return;
            element.value = options[key] || '';
        }
    }
}

function bindEvents() {
    Array.prototype.forEach.call(document.getElementsByClassName('server_option_checkbox'), element => {
        element.onclick = toggleServerOption;
    });

    var selectElement = document.getElementById('environment');
    selectElement.onchange = () => {
        options.default_server = selectElement.value;
        saveOptions('default_server', options.default_server);
    };

    ['first_name', 'last_name', 'email', 'password'].forEach(field => {
        var element = document.getElementById(field);
        if (!element) return;
        element.onchange = () => saveOptions(field, element.value);
    });
}

function toggleServerOption() {
    var server_options = environments
        .map(environment => environment.id)
        .filter(environmentId => {
            var element = document.getElementById('server_' + environmentId) || {};
            return element.checked;
        });
    options.server_options = server_options;
    saveOptions('server_options', server_options);
    applySelect(); // rerender select to hide unchecked options
}

function applySelect() {
    var selectElement = document.getElementById('environment');
    if (!selectElement) return;

    // make sure default option still in the list, otherwise select another one
    if (options.server_options.indexOf(options.default_server) < 0) {
        options.default_server = options.server_options[0];
        saveOptions('default_server', options.default_server);
    }

    environments.forEach(environment => {
        var element = document.getElementById('default_server_option_' + environment.id);
        if (!element) return;
        element.className = options.server_options.indexOf(environment.id) < 0 ? 'hidden' : '';
        if (options.default_server === environment.id) {
            element.selected = 'selected';
        }
    });
}