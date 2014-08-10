"use strict";

// TODO move element matching (attribute stuff) to a separate function
//      (keep Smooth.attribute, add Smooth.matcher that defaults to using it)
// TODO add a placeholder comment for arrays (and indicate it in ancestor)
// TODO a method to clear template analysis metadata (__smooth stuff)
// TODO support getter/setter syntax for data (funcs as data binding property)

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
            return analyzeDom(this, subcontext, attribute);
        });

        element.__smooth = meta;
        return element;
    }

    return {
        attribute: 'data-bind',
        analyze: function(element) {
            return analyzeDom(element, [], this.attribute);
        },
        version: 0.1
    };
})();