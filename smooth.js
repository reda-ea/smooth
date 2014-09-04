"use strict";

// TODO move element matching (attribute stuff) to a separate function
//      (keep Smooth.attribute, add Smooth.matcher that defaults to using it)
// TODO add a placeholder comment for arrays (and indicate it in ancestor)
// TODO a method to clear template analysis metadata (__smooth stuff)
// TODO support getter/setter syntax for data (funcs as data binding property)
// TODO test how unavailqble data is handled

window.Smooth = (function() {

    // a binding == {type, value, target} (target optional)
    function getBindings(element, attribute) {
        if(!element.hasAttribute(attribute))
            return [];
        var allbindings = element.getAttribute(attribute).split(' ');
        var ret = [];
        for (var i = 0; i < allbindings.length; i++) {
            var bindingspec = allbindings[i];
            if(bindingspec.length < 2) continue; // illegal bindings => ignore
            var binding = {};
            if(bindingspec[0] == '!') {
                binding.type = 'action';
                bindingspec = bindingspec.substring(1);
            } else
                binding.type = 'data';
            var ss = bindingspec.split('@');
            binding.value = ss[0];
            if(ss.length > 1)
                binding.target = ss[1];
            ret.push(binding);
        }
        return ret;
    }

    // finds the direct descendents of the element with that attribute, ie looks
    // through the whole hierarchy but not inside elements with the attribute
    // callback has the element as this and first arg
    // callback return is added to the matched array (which itself is returned)
    // returns an array of matched descendents (w/ callbacks already executed)
    function findDescendants(element, attribute, callback) {
        var matched = [];
        for (var i = 0; i < element.childNodes.length; i++) {
            var e = element.childNodes[i];
            if(e.nodeName[0]=='#') continue; // texts, comments, etc
            if(e.hasAttribute(attribute))
                matched.push(callback.call(e, e));
            else
                Array.prototype.push.apply(matched,
                    findDescendants(e, attribute, callback));
        }
        return matched;
    }

    // element is the DOM HTMLElement to analyze
    // context is an array of bindings on upper elements
    // attribute is the name of the binding attribute
    // returns the DOM element with the __smooth prop (usually the same param)
    function analyzeDom(element, context, attribute) {
        var meta = {context: context};
        meta.bindings = getBindings(element, attribute);
        for (var i = 0; i < meta.bindings.length; i++) {
            var binding = meta.bindings[i];
            if(binding.type == 'data' && !binding.target) {
                meta.mainBinding = i;
                break;
            }
        }
        var subcontext = (meta.mainBinding == null) ? context :
                         context.concat(meta.bindings[meta.mainBinding].value);
        meta.descendants = findDescendants(element, attribute, function() {
            var that = analyzeDom(this, subcontext, attribute);
            that.__smooth.ancestor = element;
            return that;
        });

        element.__smooth = meta;
        return element;
    }
    
    // finds the root of an analyzed DOM element
    // just a shortcut function that follows ancestor links to the root
    // returns null in case of error
    function findRoot(element) {
        if(!element.__smooth)
            return null;
        if(!element.__smooth.ancestor)
            return element;
        return findRoot(element.__smooth.ancestor);
    }

    // data is an object, context is an array. always.
    function resolveContext(data, context) {
        if(context.length === 0) return data;
        var newdata = data;
        switch(typeof context[0]) {
            case 'string':
                newdata = newdata[context[0]];
                break;
            case 'object':
                if(context[0].index) newdata = newdata[context[0].index];
                if(context[0].key) newdata = newdata[context[0].key];
                break;
            default:
                throw new Error('Invalid context : ' + context[0]);
        }
        // if(context.length === 1) return newdata; // last value uninterpreted
        if(typeof(newdata) == 'function')
            newdata = newdata.call(data);
        return resolveContext(newdata, context.slice(1));
    }

    function getAccessor(data, context, key) {
        var accessor = {};
        var current = resolveContext(data, context);
        accessor.value = current[key];
        // define get/set & resolve funcs actual type
        switch(typeof accessor.value) {
            case 'function':
                accessor.get = function() {
                    return resolveContext(data, context)[key].call(data);
                };
                accessor.set = function(value) {
                    resolveContext(data, context)[key].call(data, value);
                };
                accessor.value = accessor.value.call(data);
                break;
            case 'boolean':
            case 'number':
            case 'string':
            case 'object':
                accessor.get = function() {
                    return resolveContext(data, context)[key];
                };
                accessor.set = function(value) {
                    resolveContext(data, context)[key] = value;
                };
                break;
            case 'undefined':
                break;
            default:
                throw new Error('value type not handled: ' + typeof(data[key]));
        }
        // accessor type: value, object or array (or undefined)
        switch(typeof accessor.value) {
            case 'boolean':
            case 'number':
            case 'string':
                accessor.type = 'value';
                break;
            case 'object':
                if(accessor.value instanceof Array)
                    accessor.type = 'array';
                else
                    accessor.type = 'object';
                break;
            case 'undefined':
                accessor.type = 'undefined';
                break;
            case 'function':
                throw new Error('function resolved to another function');
        }
        return accessor;
    }

    // TODO handle form elements
    // TODO also set watches on change etc
    function applyValue(element, target, accessor) {
        if (accessor.type == 'value') {
            var value = accessor.value;
            if(value == null) value = '';
            if(accessor.hasOwnProperty('oldvalue') &&
               accessor.oldvalue == value)
                return;
            if(!target) {
                if(element.tagName == 'INPUT') {
                    if(!element.__smooth.SKIPUPDATE) {
                        element.value = value;
                        element.addEventListener('input', function() {
                            accessor.set(this.value);
                            element.value = accessor.get();
                            this.__smooth.SKIPUPDATE = true;
                            applyObject(findRoot(element));
                            delete this.__smooth.SKIPUPDATE;
                        });
                    }
                } else
                    element.innerHTML = value;
            } else
                element.setAttribute(target, value);
        }
        // TODO duplicate array children here
        // array on attribute => space separated values
    }

    function applyObject(element, data) {
        // step 1 - only main bindings
        if(!element.__smooth) return;
        var oldAccessor = {};
        if(element.__smooth.hasOwnProperty('accessor'))
            oldAccessor = element.__smooth.accessor;
        if(!data) data = oldAccessor['.'];
        if(!data) throw 'Data not provided and not found';
        element.__smooth.accessor = {'.': data};
        for(var i = 0; i < element.__smooth.bindings.length; i++) {
            var binding = element.__smooth.bindings[i];
            if(binding.type == 'data') {
                var accessor = getAccessor(
                    data, element.__smooth.context, binding.value);
                if(oldAccessor.hasOwnProperty(binding.value))
                    accessor.oldvalue = oldAccessor[binding.value].value;
                applyValue(element, binding.target, accessor);
                element.__smooth.accessor[binding.value] = accessor;
            }
            // TODO handle actions
        }
        for(var i = 0; i < element.__smooth.descendants.length; i++)
            applyObject(element.__smooth.descendants[i], data);
    }

    return {
        attribute: 'data-bind',
        analyze: function(element) {
            return analyzeDom(element, [], this.attribute);
        },
        render: function(element, data) {
            applyObject(analyzeDom(element, [], this.attribute), data);
        },
        update: function(element) {
            applyObject(element);
        },
        version: 0.1
    };
})();