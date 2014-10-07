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
    	init:function(config){
    		this.db = config.db
    		this.storeName =
    		this.db.storeId = config.storeId;
    	},
        add: function(user) {
            return this.db.query(function(execute) {
                this.store.put(user);
            });
        },
        get: function(id) {
            return this.db.query(function(execute) {
                execute(this.store.get(id));
            });
        },
        del: function(id) {
            return this.db.query(function(execute) {
                this.store.delete(id);
            });
        },
        getUserStatus: function(id) {
            var q = this.db.query(function(execute) {
                execute(this.store.get(id), 'user');
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

	User.init({storeId:'User', db:promiseddb});

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

    User.getUserStatus(2);
    User.get(1).then(function(e){
    	console.log(e.result);
    });

	window.db = promiseddb;
});