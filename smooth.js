"use strict";

// TODO move element matching (attribute stuff) to a separate function
//      (keep Smooth.attribute, add Smooth.matcher that defaults to using it)
// TODO a method to clear template analysis metadata (__smooth stuff)
// TODO test how unavailable data is handled
// TODO handle dropdowns

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
                if(context[0].key) newdata = newdata[context[0].key];
                if(typeof(context[0].index)=='number')
                    newdata = newdata[context[0].index];
                break;
            default:
                throw new Error('Invalid context : ' + context[0]);
        }
        // if(context.length === 1) return newdata; // last value uninterpreted
        if(typeof(newdata) == 'function')
            newdata = newdata.call(data);
        return resolveContext(newdata, context.slice(1));
    }

    function getAccessor(data, context, key, offset) {
        var accessor = {};
        var current = resolveContext(data, context);
        // FIXME current may be undefined / not have property key
        accessor.value = current[key];
        if(typeof(offset)=='number')
            accessor.value = accessor.value[offset];
        // define get/set & resolve funcs actual type
        switch(typeof accessor.value) {
            case 'function':
                accessor.get = function() {
                    var current = resolveContext(data, context);
                    var that = current[key];
                    if(typeof(offset)=='number') that = that[offset];
                    return that.call(current);
                };
                accessor.set = function(value) {
                    var current = resolveContext(data, context);
                    var that = current[key];
                    if(typeof(offset)=='number') that = that[offset];
                    that.call(current, value);
                };
                accessor.value = accessor.value.call(current);
                break;
            case 'boolean':
            case 'number':
            case 'string':
            case 'object':
                accessor.get = function() {
                    if(typeof(offset)=='number')
                        return resolveContext(data, context)[key][offset];
                    else
                        return resolveContext(data, context)[key];
                };
                accessor.set = function(value) {
                    if(typeof(offset)=='number')
                        resolveContext(data, context)[key][offset] = value;
                    else
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

    function defaultInputHandler() {
        if(this.__smooth.defaultInputHandler)
            this.__smooth.defaultInputHandler.call(this, arguments);
    }

    // TODO handle other form elements
    function applyValue(element, target, accessor) {
        var value = accessor.value;
        if(value == null) value = '';
        if(accessor.hasOwnProperty('oldvalue') &&
           accessor.oldvalue == value)
            return;
        if(target) {
            element.setAttribute(target, value);
            return;
        }
        if(element.tagName == 'INPUT') {
            if(!element.__smooth.SKIPUPDATE) {
                element.value = value;
                element.__smooth.defaultInputHandler = function() {
                    accessor.set(this.value);
                    var newval = accessor.get();
                    if(newval != this.value)
                        this.value = newval;
                    this.__smooth.SKIPUPDATE = true;
                    applyObject(findRoot(element));
                    delete this.__smooth.SKIPUPDATE;
                };
                element.addEventListener('input', defaultInputHandler);
            }
        } else
            element.innerHTML = value;
    }
    
    /**
     * properly handles associating an array, by duplicating the source element
     * and populating all its clones with the proper array elements
     */
    function applyArray(element, target, accessor) {
        // 0. array on attribute => space separated values
        if(target) {
            element.setAttribute(target, accessor.value.join(' '));
            return;
        }
        // 1. create bounds
        var bounds = [document.createComment('smooth'),
                      document.createComment('/smooth')];
        element.parentNode.insertBefore(bounds[0], element);
        element.parentNode.insertBefore(bounds[1], element);
        bounds[0].__smooth = bounds[1].__smooth == {
            ancestor: element
        };
        // 2. make clones
        var clones = [];
        var values = accessor.value;
        for(var i = 0; i < values.length; i++) {
            var clone = analyzeDom(element.cloneNode(true),
                                   element.__smooth.context,
                                   Smooth.attribute);
            bounds[1].parentNode.insertBefore(clone, bounds[1]);
            clone.__smooth.ancestor = element;
            clone.__smooth.bindings[clone.__smooth.mainBinding].offset = i;
            for (var j = 0; j < clone.__smooth.descendants.length; j++)
                clone.__smooth.descendants[j].__smooth.context =
                    clone.__smooth.descendants[j].__smooth.context.concat({index: i});
            applyObject(clone, element.__smooth.accessor['.']);
            clones.push(clone);
        }
        // 3. detach element
        element.__smooth.detached = true;
        element.__smooth.bounds = bounds;
        element.__smooth.clones = clones;
        element.parentNode.removeChild(element);
    }
    
    /**
     * updates an array, only adding/removing clones as required, while keeping
     * the unchanged elements as they are.
     */
    function updateArray(element, target, accessor) {
        // 0. array on attribute => space separated values
        if(target) {
            element.setAttribute(target, accessor.value.join(' '));
            return;
        }
        var values = accessor.value;
        var boundary = element.__smooth.bounds[1];
        // 1. add or remove clones ?
        var diff = values.length - element.__smooth.clones.length;
        // 1.1. add clones
        if(diff > 0) {
            for(var i = element.__smooth.clones.length; i < values.length; i++) {
                var clone = analyzeDom(element.cloneNode(true),
                                       element.__smooth.context,
                                       Smooth.attribute);
                boundary.parentNode.insertBefore(clone, boundary);
                clone.__smooth.ancestor = element;
                clone.__smooth.bindings[clone.__smooth.mainBinding].offset = i;
                for(var j = 0; j < clone.__smooth.descendants.length; j++)
                    clone.__smooth.descendants[j].__smooth.context =
                        clone.__smooth.descendants[j].__smooth.context.concat({index: i});
                element.__smooth.clones.push(clone);
            }
        // 1.2. remove clones
        } else if(diff < 0) {
            while(element.__smooth.clones.length > values.length)
                boundary.parentNode.removeChild(element.__smooth.clones[values.length]);
            element.__smooth.clones.splice(diff, -diff);
        }
        // 2. apply new data
        for(var i = 0; i < values.length; i++)
            applyObject(element.__smooth.clones[i], element.__smooth.accessor['.']);
    }
    
    function applyAccessor(element, target, accessor) {
        // TODO only if the new accessor is not an array
        // TODO if still an array, only update changes
        if(element.__smooth.detached && accessor.type != 'array') {
            var parent = element.__smooth.bounds[1].parentNode;
            for (var i = 0; i < element.__smooth.clones.length; i++)
                parent.removeChild(element.__smooth.clones[i]);
            parent.insertBefore(element, element.__smooth.bounds[1]);
            parent.removeChild(element.__smooth.bounds[0]);
            parent.removeChild(element.__smooth.bounds[1]);
            delete element.__smooth.detached;
            delete element.__smooth.bounds;
            delete element.__smooth.clones;
        }
        if(accessor.type == 'value') {
            return applyValue(element, target, accessor);
        } else if(accessor.type == 'array') {
            if(element.__smooth.detached)
                return updateArray(element, target, accessor);
            return applyArray(element, target, accessor);
        }
    }
    
    function getDefaultEvent(element) {
        return 'click';
    }
    
    function executeEvent(e) {
        if(!this.__smooth || !this.__smooth.action) {
            this.removeEventListener(e.type, executeEvent);
            return;
        }
        if(typeof(this.__smooth.action[e.type]) != 'function')
            return;
        this.__smooth.action[e.type](e);
        applyObject(findRoot(this));
    }
    
    function registerEvent(element, event, action, context) {
        // TODO more custom event types
        if(typeof(action) != 'function') {
            //console.error('Only functions can handle events');
            return;
        }
        element.__smooth.action[event] = function() {
            action.apply(context, arguments);
        };
        element.addEventListener(event, executeEvent);
    }
    
    /**
     * gets the accessors for each binding and applies that accessor to the
     * element, then loops on its descendants.
     * the special "." accessor refers to the root data object.
     */
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
                var accessor = getAccessor(data, element.__smooth.context, 
                                           binding.value, binding.offset);
                if(oldAccessor.hasOwnProperty(binding.value))
                    accessor.oldvalue = oldAccessor[binding.value].value;
                applyAccessor(element, binding.target, accessor);
                element.__smooth.accessor[binding.value] = accessor;
            } else if(binding.type == 'action') {
                if(!element.__smooth.action)
                    element.__smooth.action = {};
                var event = binding.target || getDefaultEvent(element);
                var context = resolveContext(data, element.__smooth.context);
                var action = context[binding.value];
                registerEvent(element, event, action, context);
            }
        }
        for(var i = 0; i < element.__smooth.descendants.length; i++)
            applyObject(element.__smooth.descendants[i], data);
    }

    return {
        attribute: 'data-bind',
        /*analyze: function(element) {
            return analyzeDom(element, [], this.attribute);
        },*/
        render: function(element, data) {
            applyObject(analyzeDom(element, [], this.attribute), data);
        },
        update: function(element) {
            applyObject(element);
        },
        version: 0.1
    };
})();