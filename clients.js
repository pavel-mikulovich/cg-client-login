angular.module("app").service("clients", function ($q, $http) {
    var sessionRequestMetadata = {
        header: 'Meta-CG-extension',
        cookie: {
            valuePrefix: 'connect.sid',
            value: null
        }
    };
    var host = null;

    var service = {

        getClients: function (options, environment, refresh) {

            if (!refresh) {
                var clients = getFromCache(environment);
                if (clients) return $q.resolve(clients);
            }

            host = environment.host;
            return service._initSession(options)
                .then(service._getData)
                .then(([{data: clients}, {data: users}]) => {
                    clients = _.map(clients, c => _.pick(c, ['id', 'name', 'state_short_name', 'municipality_type']));
                    users = _.map(users, c => _.pick(c, ['id', 'first_name', 'last_name', 'email', 'municipality', 'role_id', 'role']));
                    clients = initClientUsers(clients, users);
                    clients.push({id: 0, name: 'Backoffice', users: [{id: 0, first_name: options.first_name, last_name: options.last_name, email: options.email}]});
                    localStorage.setItem(getCacheKey(environment), JSON.stringify(clients));
                    return clients;

                    function initClientUsers(clients, users) {
                        let clientsHashMap = {};
                        clients.forEach(client => clientsHashMap[client.id] = client);
                        users.forEach(user => {
                            if (!user.municipality) return;
                            let client = clientsHashMap[user.municipality];
                            if (!client) return;
                            client.users = client.users || [];
                            client.users.push(user);
                        });
                        return clients;
                    }
                });

            function getCacheKey(environment) {
                return 'cg_client_login_clients_' + environment.id;
            }

            function getFromCache(environment) {
                var str = localStorage.getItem(getCacheKey(environment));
                if (!str) return;
                return JSON.parse(str);
            }
        },

        // send login request with empty session, preserve session
        _initSession: function (options) {
            var requestId = null;
            var loginUrl = host + '/login';
            initListeners();

            return $http
                .post(loginUrl, {email: options.email, password: options.password}, {headers: {[sessionRequestMetadata.header]: true}})
                .then(function (response) {
                    if (!response) Promise.reject();
                    if (!response.data.user_role_permissions.find(p => p === 'bo.clients.view')) {
                        return Promise.reject('Access denied.');
                    }
                    return sessionRequestMetadata.cookie;
                })
                .finally(disposeListeners);

            function initListeners() {
                var filters = {urls: [loginUrl]}; // {urls: ['https://*/*', 'http://*/*']},
                chrome.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeadersListener, filters, ['blocking', 'requestHeaders', 'extraHeaders']);
                chrome.webRequest.onHeadersReceived.addListener(onHeadersReceivedListener, filters, ['blocking', 'responseHeaders', 'extraHeaders']);
            }

            function disposeListeners() {
                chrome.webRequest.onBeforeSendHeaders.removeListener(onBeforeSendHeadersListener);
                chrome.webRequest.onHeadersReceived.removeListener(onHeadersReceivedListener);
            }

            function onBeforeSendHeadersListener(details) {
                var metaHeader = details.requestHeaders.find(h => h.name.toLowerCase() === sessionRequestMetadata.header.toLowerCase());
                if (!metaHeader) return; // work with only extension requests
                requestId = details.requestId;
                var headers = service._removeHeader(details.requestHeaders, 'cookie'); // cleanup cookie to get new session
                return {requestHeaders: headers};
            }

            function onHeadersReceivedListener(details) {
                if (details.requestId !== requestId) return;
                var sessionHeader = details.responseHeaders.find(h => h.name.toLowerCase() === 'set-cookie');
                if (!sessionHeader) return {responseHeaders: details.responseHeaders};
                var sessionCookie = sessionHeader.value.split('; ')[0].split('=')[1];
                sessionRequestMetadata.cookie.value = sessionCookie;
                return {responseHeaders: service._removeHeader(details.responseHeaders, 'set-cookie')}; // ignore set-coolie header
            }
        },

        _getData: function () {
            var clientsUrl = host + '/api/municipalities/clients';
            var usersUrl = host + '/api/users';
            initListeners();
            return Promise
                .all([
                    $http.get(clientsUrl, {headers: {[sessionRequestMetadata.header]: true}}),
                    $http.get(usersUrl, {headers: {[sessionRequestMetadata.header]: true}})
                ])
                .finally(disposeListeners);

            function initListeners() {
                var filters = {urls: [clientsUrl, usersUrl]};
                chrome.webRequest.onBeforeSendHeaders.addListener(onBeforeSendHeadersListener, filters, ['blocking', 'requestHeaders', 'extraHeaders']);
            }

            function onBeforeSendHeadersListener(details) {
                var metaHeader = details.requestHeaders.find(h => h.name.toLowerCase() === sessionRequestMetadata.header.toLowerCase());
                if (!metaHeader) return; // work with only extension requests
                // remove original cookie
                var headers = service._removeHeader(details.requestHeaders, 'cookie');
                // replace with custom cookie
                headers.push({name: 'Cookie', value: sessionRequestMetadata.cookie.valuePrefix + '=' + sessionRequestMetadata.cookie.value});
                return {requestHeaders: headers};
            }

            function disposeListeners() {
                chrome.webRequest.onBeforeSendHeaders.removeListener(onBeforeSendHeadersListener);
            }
        },

        _removeHeader: function (headers, name) {
            var idx = headers.findIndex(h => h.name.toLowerCase() === name.toLowerCase());
            if (idx < 0) return headers;
            headers.splice(idx, 1);
            return headers;
        },
    };

    return service;
});