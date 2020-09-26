//////////////////// HMR BEGIN ////////////////////

/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Original Author: Flux Xu @fluxxu
  MIT License https://github.com/klazuka/elm-hot/blob/master/LICENSE.txt
*/

/*
    A note about the environment that this code runs in...

    assumed in scope after injection into the Elm IIFE:
        - `scope` (has an 'Elm' property which contains the public Elm API)
        - various functions defined by Elm which we have to hook such as `_Platform_initialize` and `_Scheduler_binding`
 */
(function () {
    "use strict";

    let label = '[Laravel Elm Hot Reloading] ';
    if (! ("laravelElmHot" in window)) {
        window.laravelElmHot = {
            instances: {},
        };
    }

    // Elm 0.19.1 introduced a '$' prefix at the beginning of the symbols it emits
    function elmSymbol(symbol) {
        try {
            return eval('$' + symbol);
        } catch (e) {
            if (e instanceof ReferenceError) {
                return undefined;
            } else {
                throw e;
            }
        }
    }

    if (Object.keys(window.laravelElmHot.instances).length === 0) {
        console.log(label + "Enabled");
    }

    var cancellers = [];

    // These 2 variables act as dynamically-scoped variables which are set only when the
    // Elm module's hooked init function is called.
    var initializingInstance = null;
    var swappingInstance = null;

    function log(message) {
        // Verbose logging for debugging.
        return;
        console.log(label + message)
    }

    function findPublicModules(parent, path) {
        var modules = [];
        for (var key in parent) {
            var child = parent[key];
            var currentPath = path ? path + '.' + key : key;
            if ('init' in child) {
                modules.push({
                    path: currentPath,
                    module: child
                });
            } else {
                modules = modules.concat(findPublicModules(child, currentPath));
            }
        }
        return modules;
    }

    function registerInstance(flags, path, portSubscribes, portSends) {
        log('registering', path)

        var instance = {
            path: path,
            flags: flags,
            portSubscribes: portSubscribes,
            portSends: portSends,
            lastState: null // last Elm app state (root model)
        };

        return laravelElmHot.instances[path] = instance
    }

    function wrapPublicModule(path, module) {
        var originalInit = module.init;
        if (originalInit) {
            module.init = function (args) {
                var elm;
                var portSubscribes = {};
                var portSends = {};
                var domNode = null;
                var flags = null;
                flags = args['flags'];

                initializingInstance = registerInstance(flags, path, portSubscribes, portSends);
                elm = originalInit(args);
                wrapPorts(elm, portSubscribes, portSends);
                initializingInstance = null;
                return elm;
            };
        } else {
            console.error("Could not find a public module to wrap at path " + path)
        }
    }

    function swap(Elm, instance) {
        log('Hot-swapping module: ' + instance.path);

        swappingInstance = instance;

        var m = getAt(instance.path.split('.'), Elm);
        var elm;
        if (m) {
            // prepare to initialize the new Elm module
            var args = {flags: instance.flags};

            // remvoe all dom of old module
            window.LaravelElm.element.remove();
            let element = document.createElement('div')
            element.id = 'app'
            document.body.appendChild(element)
            window.LaravelElm.element = element;
            args['node'] = element

            elm = m.init(args);

            Object.keys(instance.portSubscribes).forEach(function (portName) {
                if (portName in elm.ports && 'subscribe' in elm.ports[portName]) {
                    var handlers = instance.portSubscribes[portName];
                    if (!handlers.length) {
                        return;
                    }
                    log('Reconnect ' + handlers.length + ' handler(s) to port \''
                      + portName + '\' (' + instance.path + ').');
                    handlers.forEach(function (handler) {
                        elm.ports[portName].subscribe(handler);
                    });
                } else {
                    delete instance.portSubscribes[portName];
                    log('Port was removed: ' + portName);
                }
            });

            Object.keys(instance.portSends).forEach(function (portName) {
                if (portName in elm.ports && 'send' in elm.ports[portName]) {
                    log('Replace old port send with the new send');
                    instance.portSends[portName] = elm.ports[portName].send;
                } else {
                    delete instance.portSends[portName];
                    log('Port was removed: ' + portName);
                }
            });
        } else {
            log('Module was removed: ' + instance.path);
        }

        swappingInstance = null;
    }

    function wrapPorts(elm, portSubscribes, portSends) {
        var portNames = Object.keys(elm.ports || {});
        //hook ports
        if (portNames.length) {
            // hook outgoing ports
            portNames
              .filter(function (name) {
                  return 'subscribe' in elm.ports[name];
              })
              .forEach(function (portName) {
                  var port = elm.ports[portName];
                  var subscribe = port.subscribe;
                  var unsubscribe = port.unsubscribe;
                  elm.ports[portName] = Object.assign(port, {
                      subscribe: function (handler) {
                          log('ports.' + portName + '.subscribe called.');
                          if (!portSubscribes[portName]) {
                              portSubscribes[portName] = [handler];
                          } else {
                              //TODO handle subscribing to single handler more than once?
                              portSubscribes[portName].push(handler);
                          }
                          return subscribe.call(port, handler);
                      },
                      unsubscribe: function (handler) {
                          log('ports.' + portName + '.unsubscribe called.');
                          var list = portSubscribes[portName];
                          if (list && list.indexOf(handler) !== -1) {
                              list.splice(list.lastIndexOf(handler), 1);
                          } else {
                              console.warn('ports.' + portName + '.unsubscribe: handler not subscribed');
                          }
                          return unsubscribe.call(port, handler);
                      }
                  });
              });

            // hook incoming ports
            portNames
              .filter(function (name) {
                  return 'send' in elm.ports[name];
              })
              .forEach(function (portName) {
                  var port = elm.ports[portName];
                  portSends[portName] = port.send;
                  elm.ports[portName] = Object.assign(port, {
                      send: function (val) {
                          return portSends[portName].call(port, val);
                      }
                  });
              });
        }
        return portSubscribes;
    }

    function getAt(keyPath, obj) {
        return keyPath.reduce(function (xs, x) {
            return (xs && xs[x]) ? xs[x] : null
        }, obj)
    }

    // hook program creation
    var initialize = _Platform_initialize;
    _Platform_initialize = function (flagDecoder, args, init, update, subscriptions, stepperBuilder) {
        var instance = initializingInstance || swappingInstance;
        var tryFirstRender = !!swappingInstance;

        var hookedInit = function (args) {
            var initialStateTuple = init(args);
            if (swappingInstance) {
                var oldModel = swappingInstance.lastState;
                var newModel = initialStateTuple.a;

                // the heart of the app state hot-swap
                initialStateTuple.a = oldModel;

                // ignore any Cmds returned by the init during hot-swap
                initialStateTuple.b = elmSymbol("elm$core$Platform$Cmd$none");
            } else {
                // capture the initial state for later
                initializingInstance.lastState = initialStateTuple.a;
            }

            return initialStateTuple
        };

        var hookedStepperBuilder = function (sendToApp, model) {
            var result;
            // first render may fail if shape of model changed too much
            if (tryFirstRender) {
                tryFirstRender = false;
                try {
                    result = stepperBuilder(sendToApp, model)
                } catch (e) {
                    window.dispatchEvent(new CustomEvent('laravel-elm-hot-reload-props-only'));
                    return;
                }
            } else {
                result = stepperBuilder(sendToApp, model)
            }

            return function (nextModel, isSync) {
                if (instance) {
                    // capture the state after every step so that later we can restore from it during a hot-swap
                    instance.lastState = nextModel
                }
                return result(nextModel, isSync)
            }
        };

        return initialize(flagDecoder, args, hookedInit, update, subscriptions, hookedStepperBuilder)
    };

    // hook process creation
    var originalBinding = _Scheduler_binding;
    _Scheduler_binding = function (originalCallback) {
        return originalBinding(function () {
            // start the scheduled process, which may return a cancellation function.
            var cancel = originalCallback.apply(this, arguments);
            if (cancel) {
                cancellers.push(cancel);
                return function () {
                    cancellers.splice(cancellers.indexOf(cancel), 1);
                    return cancel();
                };
            }
            return cancel;
        });
    };

    scope['_elm_hot_loader_init'] = function (Elm) {
        if (window.LaravelElm) {
            if ((window.LaravelElm.page) in laravelElmHot.instances) {
                swap(Elm, laravelElmHot.instances[window.LaravelElm.page]);
            }
        }

        // wrap all public modules
        var publicModules = findPublicModules(Elm);
        publicModules.forEach(function (m) {
            wrapPublicModule(m.path, m.module);
        });
    }
})();

scope['_elm_hot_loader_init'](scope['Elm']);
//////////////////// HMR END ////////////////////
