angular.module("app").service("clients", function ($q, $http, clientsStorage) {
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
                var clients = clientsStorage.getFromCache(environment);
                if (clients) return $q.resolve(clients);
            }

            host = environment.host;
            return service._initSession(options)
                .then(() => service._getData(environment))
                .then(([{data: clients}, {data: users}]) => {
                    clients = _.map(clients, c =>  _.pick(c, ['id', 'name', 'state_short_name', 'municipality_type']));
                    users = _.map(users, c => _.pick(c, ['id', 'first_name', 'last_name', 'email', 'municipality', 'role_id', 'role']));
                    users = initUserName(users);
                    clients = clientsStorage.mapUsersToClients(clients, users);
                    clients.push({id: 0, name: 'Backoffice', users: [{id: 0, municipality: 0, name: [options.first_name, options.last_name].join(' '), email: options.email}]});
                    clientsStorage.saveToCache(clients, environment);
                    return clients;
                });

            function initUserName(users) {
                return _.forEach(users, user => {
                    user.name = [user.first_name, user.last_name].join(' ');
                    delete user.first_name;
                    delete user.last_name;
                });
            }
        },

        // send login request with empty session, preserve session
        _initSession: function (options) {
            var loginUrl = host + '/login';

            return fetch(loginUrl, {
                method: 'POST',
                body: JSON.stringify({ email: options.email, password: options.password }),
                headers: { 'Content-type': 'application/json; charset=UTF-8' }
            });
        },

        _getData: function (environment) {
            var clientsUrl = host + '/api/municipalities/clients';
            var usersUrl = host + '/api/users';
            return Promise
                .all([
                    $http.get(clientsUrl, {headers: {[sessionRequestMetadata.header]: true}}),
                    $http.get(usersUrl, {headers: {[sessionRequestMetadata.header]: true}})
                ]);
        },
    };

    return service;
});