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
	var promiseddb = new PromisedDB({
		version:1,
		database:'testing',
		defineSchema: function(){
			console.log('DEFINE SCHEMA');
			this.createObjectStore('People', {
                keyPath: 'id',
                autoIncrement: true
            });
            this.createObjectStore('Groups', {
                keyPath: 'id',
                autoIncrement: true
            });
		}
	});

	window.db = promiseddb;
});