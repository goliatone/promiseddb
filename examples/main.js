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
	var promiseddb = new PromisedDB();
	promiseddb.init();
});