/*
 * promiseddb
 * https://github.com/goliatone/promiseddb
 * Created with gbase.
 * Copyright (c) 2014 goliatone
 * Licensed under the MIT license.
 */
/* jshint strict: false, plusplus: true */
/*global define: false, require: false, module: false, exports: false */
(function(root, name, deps, factory) {
    "use strict";
    // Node
    if (typeof deps === 'function') {
        factory = deps;
        deps = [];
    }

    if (typeof exports === 'object') {
        module.exports = factory.apply(root, deps.map(require));
    } else if (typeof define === 'function' && 'amd' in define) {
        //require js, here we assume the file is named as the lower
        //case module name.
        define(name.toLowerCase(), deps, factory);
    } else {
        // Browser
        var d, i = 0,
            global = root,
            old = global[name],
            mod;
        while ((d = deps[i]) !== undefined) deps[i++] = root[d];
        global[name] = mod = factory.apply(global, deps);
        //Export no 'conflict module', aliases the module.
        mod.noConflict = function() {
            global[name] = old;
            return mod;
        };
    }
}(this, 'PromisedDB', ['extend'], function(extend) {

    /**
     * Extend method.
     * @param  {Object} target Source object
     * @return {Object}        Resulting object from
     *                         meging target to params.
     */
    var _extend = extend;

    /**
     * Shim console, make sure that if no console
     * available calls do not generate errors.
     * @return {Object} Console shim.
     */
    var _shimConsole = function(con) {

        if (con) return con;

        con = {};
        var empty = {},
            noop = function() {},
            properties = 'memory'.split(','),
            methods = ('assert,clear,count,debug,dir,dirxml,error,exception,group,' +
                'groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,' +
                'table,time,timeEnd,timeStamp,trace,warn').split(','),
            prop,
            method;

        while (method = methods.pop()) con[method] = noop;
        while (prop = properties.pop()) con[prop] = empty;

        return con;
    };



    ///////////////////////////////////////////////////
    // CONSTRUCTOR
    // MDN: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
    ///////////////////////////////////////////////////

    var OPTIONS = {
        autoconnect: true,
        autoinitialize: true,

        //TODO: Move to Connection Manager
        delay: 200,
        maxTries: 5,

        version: 1.0,
        storeId: '_GST_',
        database: '_promiseddb_default_',
        resultNamespace: 'result',
        defineSchema: function() {

        },
        getDriver: function() {
            return indexedDB || mozIndexedDB || webkitIndexedDB || msIndexedDB;
        }
    };

    /**
     * PromisedDB constructor
     *
     * @param  {object} config Configuration object.
     */
    var PromisedDB = function(config) {
        config = _extend({}, this.constructor.DEFAULTS, config);

        if (config.autoinitialize) this.init(config);
    };

    PromisedDB.name = PromisedDB.prototype.name = 'PromisedDB';

    PromisedDB.VERSION = '0.0.0';

    /**
     * Make default options available so we
     * can override.
     */
    PromisedDB.DEFAULTS = OPTIONS;

    PromisedDB.isSupported = function() {
        return !!(indexedDB || mozIndexedDB || webkitIndexedDB || msIndexedDB);
    };

    ///////////////////////////////////////////////////
    // PUBLIC METHODS
    ///////////////////////////////////////////////////

    PromisedDB.prototype.init = function(config) {
        if (this.initialized) return this.logger.warn('Already initialized');
        this.initialized = true;

        console.log('PromisedDB: Init!');
        _extend(this, config);

        this.reset();

        this.driver = this.getDriver();

        if (config.autoconnect) this.connect();

        return this;
    };

    PromisedDB.prototype.reset = function(options) {
        this.tries = 0;
        this.queue = [];

        if (this.connection) this.connection.close();

        this.connection = null;
    };

    PromisedDB.prototype.connect = function() {
        var req = this.driver.open(this.database, this.version);

        //TODO: Move to Connection Manager this.manager.didConnect();
        req.onsuccess = this._onSuccess.bind(this);

        // If connection cannot be made to database.
        req.onerror = this._onFailure.bind(this);

        //Version upgrades.
        // If some other tab is loaded with the database, then it needs to be closed
        // before we can proceed.
        req.onblocked = this._onBlocked.bind(this);

        // This will run if our database is new and other
        // connections closed.
        req.onupgradeneeded = this._onUpgradeNeeded.bind(this);
    };

    PromisedDB.prototype.addStore = function(storeId){
        this[storeId] = this.objectStore(storeId);
    };

    PromisedDB.prototype.query = function(query) {
        return this.with(this.storeId, query);
    };

    PromisedDB.prototype.with = function(storeId, query) {
        this.storeId = storeId;
        //query here is a transaction callback.
        var command = function(resolve, reject) {
            if (this.connection) {
                this.resolveTransaction(storeId, query, resolve, reject);
            } else {
                this.queueTransaction(storeId, query, resolve, reject);
            }
        };
        command = command.bind(this);

        return new Promise(command);
    };

    /**
     * Add transaction info to queue for when database is available
     */
    PromisedDB.prototype.queueTransaction = function(storeId, query, resolve, reject) {
        this.queue.push([].slice.call(arguments, 0));
    };

    PromisedDB.prototype.flushQueue = function() {
        var solver = function(last, args) {
            this.resolveTransaction.apply(this, args);
        }.bind(this);
        var out = this.queue.reduce(solver, []);
        this.queue = [];
    };

    /**
     * Resolve transaction and provide results to caller
     */
    PromisedDB.prototype.resolveTransaction = function(storeId, commit, resolve, reject) {
        var commands = [],
            defaultNamespace = this.resultNamespace,
            transaction = this.connection.transaction(storeId, 'readwrite');

        /*
         * We pass the results to the resolve method.
         * Available as an argument in the `then` method!
         * `query` is actually the IDBRequest returned by
         *  `indexedbd.transaction`
         */
        var execute = function(request, namespace) {
            namespace || (namespace = defaultNamespace);
            var promised = new Promise(function(rs, rj) {
                request.onerror = rj;
                request.onsuccess = function(data) {
                    rs({
                        for: namespace,
                        result: data.target.result
                    });
                };
            });
            commands.push(promised);
        };

        try {
            /*
             * Execute commit in scope exposing store and
             * transaction.
             */
            var scope = {
                transaction:transaction,
                store:transaction.objectStore(storeId)
            };
            commit.call(scope, execute);
        } catch (e) {
            reject(e);
        }

        Promise.all(commands)
            .then(function(values) {
                /*
                 * Iterate over all promised results and collapse
                 * to a single object.
                 */
                var result = values.reduce(function(output, resolved) {
                    output[resolved.for] = resolved.result;
                    return output;
                }, {});
                resolve(result);
            })
            .catch(function(e) {
                console.error(e);
                reject(e);
            });
    };

    PromisedDB.prototype.tearDown = function(){
        var request = this.driver.deleteDatabase(this.database);
        var promise = new Promise(function(resolve, reject) {
                request.onerror = reject;
                request.onblocked = reject;
                request.onsuccess = function(data) {
                    resolve(data);
                };
            });
        return promise;
    };

    ///////////////////////////////////////////////////
    // PRIVATE METHODS
    ///////////////////////////////////////////////////
    PromisedDB.prototype._onSuccess = function(e) {
        this.tries = 0;
        this.connection = e.target.result;
        this.connection.onversionchange = this._onVersionChange.bind(this);
        this.logger.info('PromisedDB connected to ', this.database, this.version);
        this.flushQueue();
        this.onConnected();
    };

    PromisedDB.prototype._onBlocked = function(e) {
        this.logger.warn("PromisedDB: close other open tabs with this app running");
    };

    PromisedDB.prototype._onFailure = function(e) {
        //TODO: Handle in Connection Manager
        if (++this.tries < this.maxTries) {
            setTimeout(this.connect.bind(this), this.delay);
        } else {
            this.onError(e);
        }
    };

    PromisedDB.prototype._onUpgradeNeeded = function(e) {
        this.logger.warn('PromisedDB::onUpgradedNeeded', e);
        var connection = e.target.result;
        //TODO: Should we ensure we notify that
        //we had to create the DB?!
        this.defineSchema.apply(connection);
    };

    PromisedDB.prototype._onVersionChange = function(event) {
            if(this.connection) this.connection.close();
            this.logger.warn("PromisedDB is updating. Please reload!");
        };

    ///////////////////////////////////////////////////
    // STUB METHODS: To be overridden by developers.
    ///////////////////////////////////////////////////

    PromisedDB.prototype.onConnected = function() {
        this.logger.info('BD connected');
    };

    PromisedDB.prototype.onError = function(e) {
        this.logger.error('ERROR:', e);
    };

    /**
     * Logger method, meant to be implemented by
     * mixin. As a placeholder, we use console if available
     * or a shim if not present.
     */
    PromisedDB.prototype.logger = _shimConsole(console);

    /**
     * PubSub emit method stub.
     */
    PromisedDB.prototype.emit = function() {
        this.logger.warn('PromisedDB::emit method is not implemented', arguments);
    };

    return PromisedDB;
}));