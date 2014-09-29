/*global define:true requirejs:true*/
/* jshint strict: false */
requirejs.config({
    paths: {
        'jquery': 'jquery/jquery',
        'extend': 'gextend/extend',
        'promiseddb': 'promiseddb'
    }
});

define(['promiseddb', 'jquery'], function (PromisedDB, $) {
    console.log('Loading');

    var User = {
    	storeName:'User',
        add: function(user) {
            return this.db.with(this.storeName, function(execute) {
                this.objectStore('User')
                    .put(user);
            });
        },
        get: function(id) {
            return this.db.with(this.storeName, function(execute) {
                execute(this.objectStore('User')
                    .get(id));
            });
        },
        del: function(id) {
            return this.db.with(this.storeName, function(execute) {
                this.objectStore('User')
                    .delete(id);
            });
        },
        getUserStatus: function(id) {
            var q = this.db.with(this.storeName, function(execute) {
                execute(this.objectStore('User').get(id), 'user');
            });

            q.then(function(data) {
                var user = data.user,
                    active = user.active ? 'very active' : 'not very active';
                console.debug(user.name + ' is ' + active);
            }).catch(function(e) {
                console.error('ERROR:', e);
            });
        }
    };

	var promiseddb = new PromisedDB({
		version:1,
		database:'testing',
		defineSchema: function(){
			console.log('DEFINE SCHEMA');
			this.createObjectStore('User', {
                keyPath: 'id',
                autoIncrement: true
            });
            this.createObjectStore('Group', {
                keyPath: 'id',
                autoIncrement: true
            });
		}
	});

	User.db = promiseddb;

	User.add({
		id:1,
        name: 'Pepe',
        active: false
    });

    User.add({
		id:2,
        name: 'Rone',
        active: true
    });

    User.getUserStatus(1);

	window.db = promiseddb;
});