/*global define:true, describe:true , it:true , expect:true, 
beforeEach:true, sinon:true, spyOn:true , expect:true */
/* jshint strict: false */
define(['promiseddb', 'jquery'], function(PromisedDB, $) {

    describe('just checking', function() {

        it('PromisedDB should be loaded', function() {
            expect(PromisedDB).toBeTruthy();
            var promiseddb = new PromisedDB();
            expect(promiseddb).toBeTruthy();
        });

        it('PromisedDB should initialize', function() {
            var promiseddb = new PromisedDB();
            var output   = promiseddb.init();
            var expected = 'This is just a stub!';
            expect(output).toEqual(expected);
        });
        
    });

});