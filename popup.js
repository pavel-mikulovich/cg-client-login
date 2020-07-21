var app = angular.module("app", ['ui.grid', 'promiseButton']);

app.config(function ($httpProvider) {
    $httpProvider.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';
});

app.controller("controller", function ($scope, $http, $timeout, clients, featuredClients) {
    var options;
    var adminRoleId = 9;

    $scope.activeClient = null;

    $scope.clientsGridOptions = {
        rowTemplate: "<div ng-repeat=\"(colRenderIndex, col) in colContainer.renderedColumns track by col.uid\" ui-grid-one-bind-id-grid=\"rowRenderIndex + '-' + col.uid + '-cell'\" class=\"ui-grid-cell\" ng-class=\"{ 'ui-grid-row-header-cell': col.isRowHeader, active: row.entity == grid.appScope.activeClient }\" role=\"{{col.isRowHeader ? 'rowheader' : 'gridcell'}}\" ui-grid-cell></div>",
        enableFiltering: true,
        enableGridMenu: true,
        columnDefs: [
            {name: 'id', type: 'number', width: 60},
            {name: 'name', width: 180},
            {name: 'state', field: 'state_short_name'},
            {name: 'type', field: 'municipality_type'},
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
            {name: 'id', type: 'number', width: 60},
            {name: 'Email', field: 'email', width: 180},
            {name: 'First Name', field: 'first_name'},
            {name: 'Last Name', field: 'last_name'},
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
        {id: 'dev', name: 'Dev', host: 'http://localhost:3000'},
        {id: 'stage', name: 'Stage', host: 'http://cleargov-stage.herokuapp.com'},
        {id: 'pre_prod', name: 'Pre prod', host: 'http://cleargov-pre-prod.herokuapp.com'},
        {id: 'prod', name: 'Prod', host: 'https://www.cleargov.com'},
    ];

    init();

    function init() {
        return initOptions()
            .then(initEnvironment)
            .then(reloadClients);

        function initOptions() {
            return readOptions().then(data => {
                options = data;
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

    function loginUser(user) {
        return new Promise((resolve, reject) => {
            return $http.post($scope.selectedEnvironment.host + '/login', {email: options.email, password: options.password})
                .then(() => {
                    return loginAsUser(user).then(() => {
                        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                            var tab = _.first(tabs);
                            if (!tab) return;
                            var url = $scope.selectedEnvironment.host + '/' + (user.id ? 'admin' : 'backoffice');
                            if (_.startsWith(tab.url.toLowerCase(), 'chrome://newtab')) {
                                // window.location works smoother, but not accessible on start page, so here is a workaround
                                chrome.tabs.update(tab.id, {url: url});
                            } else {
                                chrome.tabs.executeScript(tab.id, {code: `window.location = '${url}'`});
                            }
                            setTimeout(window.close, 100);
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

        function extendRows(rows) {
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