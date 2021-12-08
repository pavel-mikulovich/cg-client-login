angular.module("app").service("clientsStorage", function () {

    let propDelimiter = ',';
    let objDelimiter = ';';

    var service = {

        saveToCache: function(clients, environment) {
            clients = _.cloneDeep(clients);
            let users = _(clients).flatMap('users').compact().value();
            _.forEach(clients, c => delete c.users);
            localStorage.setItem(getCacheKey(environment), JSON.stringify({clients: minify(clients), users: minify(users)}));

            function minify(list) {
                let str = '';
                let headers = getUniqProps(list);
                str += _.values(headers).join(propDelimiter) + objDelimiter;
                str += _
                    .map(list, item => {
                        return _.map(headers, prop => item[prop]).join(propDelimiter);
                    })
                    .join(objDelimiter);
                return str;

                function getUniqProps(list) {
                    let headers = {};
                    _.forEach(list, item => {
                        _.forEach(item, (val, prop) => {
                            headers[prop] = prop;
                        });
                    });
                    return headers;
                }
            }
        },

        getFromCache: function(environment) {
            var str = localStorage.getItem(getCacheKey(environment));
            if (!str) return;
            let {clients, users} = JSON.parse(str);
            clients = deMinify(clients);
            users = deMinify(users);
            return service.mapUsersToClients(clients, users);

            function deMinify(str) {
                let arr = str.split(objDelimiter);
                let header = arr.shift();
                header = header.split(propDelimiter);
                return _.map(arr, row => {
                    return _.zipObject(header, row.split(propDelimiter));
                });
            }
        },

        mapUsersToClients: function (clients, users) {
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
        },
    };

    return service;

    function getCacheKey(environment) {
        return 'cg_client_login_clients';
    }
});