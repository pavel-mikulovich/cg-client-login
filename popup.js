angular.module("app", ['ui.grid', 'promiseButton'])

    .config(function ($httpProvider) {
        $httpProvider.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';
    })

    .controller("controller", function ($q, $scope, $http, $timeout, clients, featuredClients) {
        var options;
        var adminRoleId = 9;

        $scope.activeClient = null;
        $scope.showQuickLogin = false;

        var clientCellTemplate = '<div ng-click="grid.appScope.toggleUsers(row.entity)" class="ui-grid-cell-contents client-clickable-cell" title="TOOLTIP">{{COL_FIELD CUSTOM_FILTERS}}</div>';
        $scope.clientsGridOptions = {
            rowTemplate: "<div ng-repeat=\"(colRenderIndex, col) in colContainer.renderedColumns track by col.uid\" ui-grid-one-bind-id-grid=\"rowRenderIndex + '-' + col.uid + '-cell'\" class=\"ui-grid-cell\" ng-class=\"{ 'ui-grid-row-header-cell': col.isRowHeader, active: row.entity == grid.appScope.activeClient }\" role=\"{{col.isRowHeader ? 'rowheader' : 'gridcell'}}\" ui-grid-cell></div>",
            enableFiltering: true,
            enableGridMenu: true,
            columnDefs: [
                {name: 'id', type: 'number', width: 55, cellTemplate: clientCellTemplate},
                {name: 'name', cellTemplate: clientCellTemplate},
                {name: 'state', field: 'state_short_name', width: 140, cellTemplate: clientCellTemplate},
                {name: 'type', field: 'municipality_type', width: 85, cellTemplate: clientCellTemplate},
                {
                    name: 'featured', displayName: 'Actions', cellTemplate: `
                <div class="ui-grid-cell-contents actions" ng-class="{'no-users': !row.entity.users.length}">
                    <a promise-button="grid.appScope.loginClient(row.entity)" class="action-link">login</a>
                    <i class="fa-star" ng-class="row.entity.featured ? 'fas' : 'far'" ng-click="grid.appScope.toggleFeatured(row.entity, 'client')"></i>
                    <i class="fa-user" ng-class="row.entity == grid.appScope.activeClient ? 'fas' : 'far'" ng-click="grid.appScope.toggleUsers(row.entity)"></i>
                </div>`,
                    width: 110
                },
            ],
            onRegisterApi: function (apiObject) {
                $scope.clientsGridOptions.gridApi = apiObject;
                refreshTable();
            }
        };

        $scope.usersGridOptions = {
            enableFiltering: true,
            enableGridMenu: false,
            columnDefs: [
                {name: 'id', type: 'number', width: 55},
                {name: 'Email', field: 'email'},
                {name: 'Name', field: 'name'},
                {name: 'Role', field: 'role', width: 85},
                {
                    name: 'featured', displayName: 'Actions', cellTemplate: `
                <div class="ui-grid-cell-contents actions" ng-if="row.entity.id >= 0">
                    <a promise-button="grid.appScope.loginUser(row.entity)" class="action-link">login</a>
                    <i class="fa-star" ng-class="row.entity.featured ? 'fas' : 'far'" ng-click="grid.appScope.toggleFeatured(row.entity, 'user')"></i>
                </div>`,
                    width: 110,
                    enableColumnMenu: false
                },
            ],
        };

        var environments = [
            {id: 'local', server: 'dev', name: 'Local', host: 'http://localhost:3000', adminUrl: 'http://localhost:4200/app/home'},
            {id: 'dev1', server: 'dev1', name: 'Dev1', host: 'https://dev1.getcleargov.com', adminUrl: 'https://dev1.getcleargov.com/app/home'},
            {id: 'dev2', server: 'dev2', name: 'Dev2', host: 'https://dev2.getcleargov.com', adminUrl: 'https://dev2.getcleargov.com/app/home'},
            {id: 'dev3', server: 'dev3', name: 'Dev3', host: 'https://dev3.getcleargov.com', adminUrl: 'https://dev3.getcleargov.com/app/home'},
            {id: 'dev4', server: 'dev4', name: 'Dev4', host: 'https://dev4.getcleargov.com', adminUrl: 'https://dev4.getcleargov.com/app/home'},
            {id: 'dev5', server: 'dev5', name: 'Dev5', host: 'https://dev5.getcleargov.com', adminUrl: 'https://dev5.getcleargov.com/app/home'},
            {id: 'dev6', server: 'dev6', name: 'Dev6', host: 'https://dev6.getcleargov.com', adminUrl: 'https://dev6.getcleargov.com/app/home'},
            {id: 'pre_prod', server: 'pre-prod', name: 'Pre prod', host: 'https://preprod.getcleargov.com', adminUrl: 'https://preprod.getcleargov.com/app/home'},
            {id: 'jedi', server: 'jedi', name: 'Jedi', host: 'https://jedi.getcleargov.com', adminUrl: 'https://jedi.getcleargov.com/app/home'},
            {id: 'doc', server: 'doc', name: 'Doc', host: 'https://doc.getcleargov.com', adminUrl: 'https://doc.getcleargov.com/app/home'},
            {id: 'prod', server: 'prod', name: 'Prod', host: 'https://cleargov.com', adminUrl: 'https://cleargov.com/app/home'},
        ];

        init();

        function init() {
            return initOptions()
                .then(initEnvironment)
                .then(() => {
                    reloadClients(false, true);
                });

            function initOptions() {
                return CG.optionsStorage.readOptions().then(data => {
                    options = data;
                    $scope.showQuickLogin = options.show_quick_login;
                });
            }

            function initEnvironment() {
                return new Promise((resolve, reject) => {
                    // 1. filter environments by options
                    var serverOptions = _.keyBy(options.server_options);
                    $scope.environments = _.filter(environments, env => serverOptions[env.id]);

                    // 2. init selected environment
                    var defaultServer = options.default_server;
                    chrome.tabs.query({active: true, currentWindow: true}, function ([tab]) {
                        if (!tab) return;
                        $scope.selectedEnvironment = findEnv($scope.environments, tab.url) // by current url
                            || _.find($scope.environments, {id: defaultServer}) // by settings
                            || $scope.environments[0];
                        resolve();
                    });
                });

                function findEnv(envs, url = '') {
                    return envs.find(x => url.indexOf(x.host) === 0);
                }
            }
        }

        $scope.changeEnvironment = function () {
            // reloadClients();
        };

        $scope.refresh = function () {
            $scope.activeClient = null;
            return reloadClients(true);
        };

        function reloadClients(refresh, skipRelocate) {
            const def = $q.defer();

            if (skipRelocate) {
                reload(def);
            } else {
                locateToClearGov((err) => {
                    if (err) {
                        showErrorMessage(err);
                        def.reject();
                        return;
                    }

                    reload(def);
                });
            }

            return def.promise;

            function reload(def) {
                $scope.clientsGridOptions.data = [];
                return clients
                    .getClients(options, $scope.selectedEnvironment, refresh).then(function (clients) {
                        featuredClients.initFeaturedClients(clients);
                        featuredClients.sortFeaturedOnTop(clients);
                        $scope.clientsGridOptions.data = clients;
                        refreshTable();
                        def.resolve();
                    })
                    .catch(() => {
                        showErrorMessage();
                        def.reject();
                    });
            }
        }

        // locate needed to connect cookies in between extension and browser page
        function locateToClearGov(callback) {
            chrome.tabs.query({ active: true, currentWindow: true }, function ([tab]) {
                if (!tab) return;
                // no need to locate if already there
                if (_.startsWith(tab.url.toLowerCase(), $scope.selectedEnvironment.host)) {
                    callback();
                    return;
                }

                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (url) => {
                        window.location = url;
                    },
                    args: [$scope.selectedEnvironment.host],
                });

                setTimeout(callback, 1000)
            });
        }

        function refreshTable() {
            setTimeout(() => {
                if (!$scope.clientsGridOptions.gridApi) return;
                $scope.clientsGridOptions.gridApi.core.notifyDataChange('column');
            }, 100);
        }

        $scope.toggleFeatured = function (entity, type) {
            entity.featured = !entity.featured;
            let list = $scope.clientsGridOptions.data;
            if (type === 'user') {
                list = _(list).flatMap('users').compact().value();
            }
            featuredClients.setFeatured(list, type);
        };

        $scope.loginClient = function (client) {
            if (_.isEmpty(client.users)) return Promise.resolve();
            var featuredUser = client.users.find(user => user.featured);
            var cgAdminUser = client.users.find(user => user.email.lastIndexOf('cleargov.com') > 0 && user.role_id === adminRoleId);
            var adminUser = client.users.find(user => user.role_id === adminRoleId);
            var user = featuredUser || cgAdminUser || adminUser || client.users[0];
            return loginUser(user);
        };

        $scope.loginUser = function (user) {
            return loginUser(user);
        };

        $scope.loginByUserId = function (id = 0) {
            var user = _($scope.clientsGridOptions.data).flatMap('users').compact().find(u => u.id == id);
            if (!user) {
                return showErrorMessage('User Not Found');
            } else {
                return loginUser(user);
            }
        };

        function loginUser(user) {
            const def = $q.defer();
            locateToClearGov(() => {
                $http.post($scope.selectedEnvironment.host + '/login', {email: options.email, password: options.password})
                    .then(() => {
                        return loginAsUser(user).then(() => {
                            chrome.tabs.query({ active: true, currentWindow: true }, function ([tab]) {
                                if (!tab) return;
                                let url = +user.id
                                    ? $scope.selectedEnvironment.adminUrl
                                    : `${$scope.selectedEnvironment.host}/backoffice`
                                chrome.scripting.executeScript({
                                    target: { tabId: tab.id },
                                    func: (url) => {
                                        localStorage.setItem('login_source', 'extension');
                                        window.location = url;
                                    },
                                    args: [url],
                                });
                                setTimeout(window.close, 100);
                            });
                        });

                    })
                    .catch(error => {
                        def.reject(error);
                        return showErrorMessage(error);
                    });
            });
            return def.promise;

            function loginAsUser(user) {
                if (user.email === options.email) return Promise.resolve();
                user.password = ' ';
                user.skipPassword = true;
                return $http.post($scope.selectedEnvironment.host + '/login', user);
            }
        }

        $scope.toggleUsers = function (client) {
            if (!client || $scope.activeClient === client) { // hide when second click on same client
                $scope.activeClient = null;
            } else {
                $scope.activeClient = client;
                $scope.usersGridOptions.data = extendRows(client.users);
                $timeout(() => {
                    $scope.clientsGridOptions.gridApi.core.scrollTo($scope.clientsGridOptions.data[$scope.clientsGridOptions.data.indexOf(client) + 7]);
                }, 300);
            }

            function extendRows(rows = []) {
                let minCount = 5;
                if (rows.length < minCount) {
                    rows = _.clone(rows);
                    let addCount = minCount - rows.length;
                    _.times(addCount, () => rows.push({}));
                }
                return rows;
            }
        };

        function showErrorMessage(error) {
            var message = getMessage(error);
            var element = document.getElementById("snackbar");
            element.className = "show";
            element.textContent = message;
            setTimeout(function () {
                element.className = element.className.replace("show", "");
            }, 6000);
            return Promise.reject(error);

            function getMessage(error) {
                var message = 'Something went wrong.';
                var errMsg = _.get(error, 'data.error');
                if (typeof error === 'string') {
                    message = error;
                } else if (typeof errMsg === 'string') {
                    message = errMsg;
                } else if (error.status === 401) {
                    message = 'Bad credentials.';
                } else if (error.status === -1) {
                    message = 'No connection.';
                }
                return message;
            }
        }
    });