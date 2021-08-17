(function () {
    var options = null;
    var environments = [
        {id: 'local', name: 'Local'},
        {id: 'dev', name: 'Dev'},
        {id: 'stage', name: 'Stage'},
        {id: 'pre_prod', name: 'Pre-prod'},
        {id: 'jedi', name: 'Jedi'},
        {id: 'doc', name: 'Doc'},
        {id: 'prod', name: 'Prod'},
    ];

    init();

    function init() {
        bindEvents();
        return CG.optionsStorage.readOptions()
            .then(applyOptions);

        function applyOptions(data) {
            options = data;
            applyCheckboxes();
            applySelect();
            applyCheckbox();
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

            function applyCheckbox() {
                var element = document.getElementById('show_quick_login');
                var labelElement = document.getElementById('show_quick_login_label');
                if (!element || !labelElement) return;
                if (options.show_quick_login) {
                    element.checked = true;
                    labelElement.textContent = 'Yes';
                } else {
                    element.checked = false;
                    labelElement.textContent = 'No';
                }
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
            CG.optionsStorage.saveOptions('default_server', options.default_server);
        };

        var quickLoginElement = document.getElementById('show_quick_login');
        quickLoginElement.onchange = () => {
            var labelElement = document.getElementById('show_quick_login_label');
            options.show_quick_login = quickLoginElement.checked;
            labelElement.textContent = options.show_quick_login ? 'Yes' : 'No';
            CG.optionsStorage.saveOptions('show_quick_login', options.show_quick_login);
        };

        ['first_name', 'last_name', 'email', 'password'].forEach(field => {
            var element = document.getElementById(field);
            if (!element) return;
            element.onchange = () => CG.optionsStorage.saveOptions(field, element.value);
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
        CG.optionsStorage.saveOptions('server_options', server_options);
        applySelect(); // rerender select to hide unchecked options
    }

    function applySelect() {
        var selectElement = document.getElementById('environment');
        if (!selectElement) return;

        // make sure default option still in the list, otherwise select another one
        if (options.server_options.indexOf(options.default_server) < 0) {
            options.default_server = options.server_options[0];
            CG.optionsStorage.saveOptions('default_server', options.default_server);
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

})(window);