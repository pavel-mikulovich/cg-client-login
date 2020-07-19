angular.module("app").service("featuredClients", function () {

    var service = {

        // sort by name, featured on top
        sortFeaturedOnTop: function (items) {
            return items.sort(function(a, b) {
                var nameA = (a.featured ? 0 : 1) + a.name.toLowerCase();
                var nameB = (b.featured ? 0 : 1) + b.name.toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            })
        },

        initFeaturedClients: function (clients) {
            var featuredClients = _.keyBy(service.getFeatured('client'));
            var featuredUsers = _.keyBy(service.getFeatured('user'));
            featuredClients[0] = true; // backoffice
            clients.forEach(x => {
                x.featured = !!featuredClients[x.id];
                _.forEach(x.users, y => {
                    (y.featured = !!featuredUsers[y.id])
                });
            });
        },

        getFeatured: function (type) {
            var featuredIdsStr = localStorage.getItem(service.getCacheKey(`featured_${type}s`)) || '[]';
            return JSON.parse(featuredIdsStr || '[]');
        },

        setFeatured: function (entities, type) {
            var ids = [];
            entities.forEach(c => {
                if (c.featured) ids.push(c.id);
            });
            localStorage.setItem(service.getCacheKey(`featured_${type}s`), JSON.stringify(ids));
        },

        getCacheKey: function (property) {
            return 'cg_client_login_' + property;
        },

    };

    return service;
});