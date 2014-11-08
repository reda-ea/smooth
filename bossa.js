"use strict";

(function() {
    function loadOneScript(url, success, fail) {
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        var failtout = setTimeout(function() {
            fail && fail();
        }, 15000);
        var successcb = function() {
            clearTimeout(failtout);
            success && success();
        };
        script.type = 'text/javascript';
        script.src = url;
        script.onreadystatechange = successcb;
        script.onload = successcb;
        head.appendChild(script);
    }
    function loadOneStyle(url, success, fail) {
        var head = document.getElementsByTagName( 'head' )[0];
        var link = document.createElement( 'link' );
        link.setAttribute( 'href', url );
        link.setAttribute( 'rel', 'stylesheet');
        link.setAttribute( 'type', 'text/css');
        var sheet, cssRules;
        if ('sheet' in link) {
            sheet = 'sheet'; cssRules = 'cssRules';
        } else {
            sheet = 'styleSheet'; cssRules = 'rules';
        }
        var interval_id = setInterval( function() {
            try {
                if (link[sheet] && link[sheet][cssRules].length) {
                    clearInterval(interval_id);
                    clearTimeout(timeout_id);
                    success && success();
                }
            }catch(e){console.error(e);}
        }, 10);
        var timeout_id = setTimeout(function() {
            clearInterval(interval_id);
            clearTimeout(timeout_id);
            fail();
        }, 15000);
        head.appendChild( link );
    }
    function loadOneContent(template, success, fail) { // {container, url, controller}
        if(typeof template != 'object')
            throw new Error('template must be an object');
        if(!template.container) return;
        if(!template.url) {
            template.container.innerHTML = '';
            if(template.controller)
                try {
                    template.controller.call(template.container);
                } catch(e) {
                    console.error(e);
                    fail && fail(e);
                    return;
                }
            return;
        }
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if(xhr.readyState != 4) return;
            if(xhr.status==200) {
                template.container.innerHTML = xhr.responseText;
                if(template.controller)
                    try {
                        template.controller.call(template.container);
                    } catch(e) {
                        console.error(e);
                        fail && fail(e);
                        return;
                    }
                success && success();
            } else
                fail && fail();
        };
        xhr.open('GET', template.url, true);
        xhr.send();
    }
    
    function sameOrigin(url) {
        var loc = window.location,
            a = document.createElement('a')
        a.href = url

        return a.hostname === loc.hostname &&
            a.port === loc.port &&
            a.protocol === loc.protocol &&
            loc.protocol !== 'file:'
    }
    
    var loadOneJSON = function(url, success, fail) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) { // `DONE`
                var status = xhr.status;
                if (status == 200) {
                    var data = JSON.parse(xhr.responseText);
                    success && success.call(data, data);
                }
                else {
                    fail && fail(new Error(status));
                }
            }
        };
        xhr.open('GET', url, true);
        xhr.send();
    };
    
    function loadOneJSONP(url, success, fail) { // url should contain $JSONP
        // new callback name
        var r4 = function(){
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16).substring(1);
        };
        var cbname = 'bossa' + r4() + r4() + r4() + r4();
        window[cbname] = success;
        var fullurl = url.replace('$JSONP', cbname);
        return loadOneScript(fullurl, null, fail);
    }
    
    // TODO add json/jsonp
    // TODO handle caching
    window.Bossa = {
        js: function(url, success, fail) {
            if(!url) throw 'Content URL must be provided';
            loadOneScript(url, function() {
                if(typeof(success)=='function')
                    success.apply(null, arguments);
            }, function() {
                if(typeof(fail)=='function')
                    fail.apply(null, arguments);
            });
        },
        css: function(url, success, fail) {
            if(!url) throw Error('Content URL must be provided');
            loadOneStyle(url, function() {
                if(typeof(success)=='function')
                    success.apply(null, arguments);
            }, function() {
                if(typeof(fail)=='function')
                    fail.apply(null, arguments);
            });
        },
        dom: function(url, success, fail) {
            // alternate syntax: container, url, success, fail
            if(url instanceof HTMLElement) {
                var ctn = url;
                url = success;
                success = fail;
                if(arguments.length > 3)
                    fail = arguments[3];
            }
            if(!url) throw Error('Content URL must be provided');
            if(!ctn) ctn = document.createElement('body');
            loadOneContent({
                container: ctn,
                url: url
            }, function() {
                if(typeof(success)=='function')
                    success.apply([].slice.call(ctn.children), arguments);
            }, function() {
                if(typeof(fail)=='function')
                    fail.apply([].slice.call(ctn.children), arguments);
            });
        },
        json: function(url, success, fail) {
            // alternate syntax: url, alias, success, fail (caches result)
            if(typeof(success) == 'string') {
                var alias = success;
                success = fail;
                if(arguments.length > 3)
                    fail = arguments[3];
            }
            if(!url) throw Error('Content URL must be provided');
            var func = (url.indexOf('$JSONP') == -1) ?
                        loadOneJSON : loadOneJSONP;
            func(url, function() {
                if(typeof(success)=='function') {
                    if(alias) window[alias] = arguments[0]
                    success.apply(arguments[0], arguments);
                }
            }, function() {
                if(typeof(fail)=='function')
                    fail.apply(null, arguments);
            });
        }
    }
    
})();