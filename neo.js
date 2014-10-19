"use strict";

(function() {
    var Promise = function(cb) {
        var p = {
            _pending : 0,
            _thens : [],
            _ors   : [],
            _status: 0, // 1 ok 2 fail
            _next  : null, // for delegate
            and: function() {
                throw new Error("Call do() / then() / or() before and()");
            },
            then: function(cb) {
                this.and = this.then;
                if(this._next) {
                    this._next.then(cb);
                    return this;
                }
                switch(this._status) {
                    case 0:
                        this._thens.push(cb);
                        break;
                    case 1:
                        try {
                            cb.apply(this, arguments);
                        } catch(e){console.error(e);}
                        break;
                }
                return this;
            },
            or: function(cb) {
                this.and = this.or;
                switch(this._status) {
                    case 0:
                        this._ors.push(cb);
                        break;
                    case 1:
                        if(this._next)
                            this._next.or(cb);
                        break;
                    case 2:
                        try {
                            cb.apply(this, arguments);
                        } catch(e){console.error(e);}
                        break;
                }
                return this;
            },
            do: function(cb) { // this.cb(onsuccess, onfail)
                this.and = this.do;
                if(this._next && this._status != 2) {
                    this._next.do(cb);
                    return this;
                }
                if(this.funcs) {
                    this.funcs.push(cb);
                    return this;
                }
                if(this._status) return this;
                this._pending++;
                var me = this;
                setTimeout(function() { // force async
                    try {
                        cb.call(me, function(){me.succeed();},function(e){me.fail(e);});
                    } catch(e){me.fail(e);}
                }, 0);
                return this;
            },
            succeed: function() {
                if(this._status) return this;
                this._pending--;
                if(this._pending) return this;
                this._status = 1;
                for(var i=0; i<this._thens.length; i++)
                    try {
                        this._thens[i].apply(this, arguments);
                    } catch(e){console.error(e);}
                this._thens = [];
                return this;
            },
            fail: function() {
                if(this._status) return this;
                this._status = 2;
                for(var i=0; i<this._ors.length; i++)
                    try {
                        this._ors[i].apply(this, arguments);
                    } catch(e){console.error(e);}
                this._ors = [];
                return this;
            },
            // delegate future functions to a new promise
            // the new promise will be used once/if the current one succeeds
            delegate: function() {
                if(this._next) {
                    this._next.delegate();
                    return this;
                }
                if(this._status) return this;
                var my = this;
                my._next = new Promise();
                my._next.funcs = [];
                my._next._thens = my._thens;
                my._thens = [function() {
                    var nextfuncs = my._next.funcs;
                    my._next.funcs = null;
                    var nextnext = my._next._next;
                    my._next._next = null; // UGLY HACK to make addfunc execute now
                    for (var i = 0; i < nextfuncs.length; i++)
                        my._next.do(nextfuncs[i]);
                    my._next._ors = my._ors;
                    my._next._next = nextnext;
                }];
                return this;
            }
        };
        p.sync = p.delegate;
        if(cb) p.do(cb);
        return p;
    };
    
    /**
     * specializes a function, by binding the first few arguments
     **/
    var specialize = function(cb) {
        if(typeof(cb)!='function')
            throw new Error('Please provide a unction as first argument');
        var boundargs = Array.prototype.slice.call(arguments, 1);
        return function() {
            var newargs = boundargs.concat(Array.prototype.slice.call(arguments));
            return cb.apply(this, newargs);
        };
    };
    
    window.Neo = {
        do: Promise,
        spec: specialize
    };
})();