var http = require('http');

var couchpotato = function(){
    this.name = 'couchpotato';
    this.displayname = 'CouchPotato';
    this.description = 'Send commands to CouchPotato';

    this.defaultPrefs = [{
        name: 'hostname',
        type: 'text',
        value: 'localhost'
    },{
        name: 'port',
        type: 'text',
        value: '5050'
    },{
        name: 'api_key',
        type: 'text',
        value: ''
    }];
}

couchpotato.prototype.init = function(){
    var self = this;

    this.listen('couchpotato add (:<movie>.+?)', 'standard', function(from, interface, params){
        self.findMovie(params[0], interface, from)
    });
}

couchpotato.prototype.findMovie = function(name, interface, from){
    var self = this;
    this.getPrefs().done(function(prefs){
        var options = {
            hostname: prefs.hostname,
            port: prefs.port,
            path: '/api/'+prefs.api_key+'/search/?q='+encodeURIComponent(name),
            headers: {
                'user-agent': 'Woodhouse Bot - https://github.com/Woodhouse-bot/woodhouse'
            }
        };
        var data = "";

        var req = http.get(options, function(res) {
            res.on('data', function (response) {
                data += String(response);
            });

            res.on('end', function() {
                var obj = JSON.parse(data);
                var movies = obj.movies;

                self.checkMovie(movies, interface, from);
            });
        }).on('error', function(e) {
            console.log('problem with request: ' + e.message);
        });
    });
}

couchpotato.prototype.checkMovie = function(movies, interface, from){
    var self = this;

    if (movies.length > 0){
        var movie = movies.shift();
        var message = 'Did you mean: ' + movie.titles[0] + ' (' + movie.year + ') - http://www.imdb.com/title/' + movie.imdb;

        this.sendMessage(message, interface, from);
        this.api.addYesNoQuestion(
            from,
            message,
            function(){
                self.addMovie(movie, interface, from);
            },
            function(){
                self.checkMovie(movies, interface, from)
            }
        );
    } else {
        this.sendMessage('No more results', interface, from);
    }
}

couchpotato.prototype.addMovie = function(movie, interface, from){
    var self = this;
    this.getPrefs().done(function(prefs){
        var options = {
            hostname: prefs.hostname,
            port: prefs.port,
            path: '/api/'+prefs.api_key+'/movie.add/?identifier='+movie.imdb+'&title='+encodeURIComponent(movie.titles[0]),
            headers: {
                'user-agent': 'Woodhouse Bot - https://github.com/Woodhouse-bot/woodhouse'
            }
        },
        data = '';

        var req = http.get(options, function(res) {
            res.on('data', function (response) {
                data += response;
            });

            res.on('end', function() {
                var obj = JSON.parse(data);

                if (obj.success === 'true') {
                    self.sendMessage(movie.titles[0] + ' added', interface, from);
                } else {
                    self.sendMessage('There was an error, please check the CouchPotato logs', interface, from);
                }

            });
        }).on('error', function(e) {
            console.log('problem with request: ' + e.message);
        });
    });
}

module.exports = couchpotato;
