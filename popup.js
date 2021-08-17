angular.module("app", ['ui.grid', 'promiseButton'])

    .config(function ($httpProvider) {
        $httpProvider.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';
    })

    .controller("controller", function ($scope, $http, $timeout, clients, featuredClients) {
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
            {id: 'local', server: 'dev', name: 'Local', host: 'http://localhost:3000'},
            {id: 'dev', server: 'stage-dev', name: 'Dev', host: 'https://dev.getcleargov.com'},
            {id: 'stage', server: 'stage', name: 'Stage', host: 'https://stage.getcleargov.com'},
            {id: 'pre_prod', server: 'pre-prod', name: 'Pre prod', host: 'https://preprod.getcleargov.com'},
            {id: 'jedi', server: 'jedi', name: 'Jedi', host: 'https://jedi.getcleargov.com'},
            {id: 'doc', server: 'doc', name: 'Doc', host: 'https://doc.getcleargov.com'},
            {id: 'prod', server: 'prod', name: 'Prod', host: 'https://cleargov.com'},
        ];

        init();

        function init() {
            return initOptions()
                .then(initEnvironment)
                .then(reloadClients);

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
                    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                        var tab = tabs[0];
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
            reloadClients();
        };

        $scope.refresh = function () {
            $scope.activeClient = null;
            return reloadClients(true);
        };

        function reloadClients(refresh) {
            $scope.clientsGridOptions.data = [];
            return clients
                .getClients(options, $scope.selectedEnvironment, refresh).then(function (clients) {
                    featuredClients.initFeaturedClients(clients);
                    featuredClients.sortFeaturedOnTop(clients);
                    $scope.clientsGridOptions.data = clients;
                })
                .catch(showErrorMessage);
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
            var user = _($scope.clientsGridOptions.data).flatMap('users').find(u => u.id == id);
            if (!user) {
                return showErrorMessage('User Not Found');
            } else {
                return loginUser(user);
            }
        };

        function loginUser(user) {
            return new Promise((resolve, reject) => {
                return $http.post($scope.selectedEnvironment.host + '/login', {email: options.email, password: options.password})
                    .then(() => {
                        return loginAsUser(user).then(() => {
                            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                                let tab = _.first(tabs);
                                if (!tab) return;
                                let url = $scope.selectedEnvironment.host + '/' + (+user.id ? 'admin' : 'backoffice');
                                let setLoginSrcContextStr = `localStorage.setItem('login_source', 'extension')`;
                                if (_.startsWith(tab.url.toLowerCase(), 'chrome://newtab')) {
                                    // window.location works smoother, but not accessible on start page, so here is a workaround
                                    chrome.tabs.update(tab.id, {url: url}, function (newTab) {
                                        let listener = (tabId, changeInfo, tab) => {
                                            if (tabId === newTab.id && changeInfo.status === 'complete') {
                                                chrome.tabs.executeScript(tab.id, {code: setLoginSrcContextStr});
                                                chrome.tabs.onUpdated.removeListener(listener);
                                                setTimeout(window.close, 100);
                                            }
                                        };
                                        chrome.tabs.onUpdated.addListener(listener);
                                    });
                                } else {
                                    chrome.tabs.executeScript(tab.id, {code: `window.location = '${url}'`});
                                    setTimeout(window.close, 100);
                                }
                            });
                        });

                    })
                    .catch(error => {
                        reject(error);
                        return showErrorMessage(error);
                    });
            });

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