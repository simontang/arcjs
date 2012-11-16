/*global window,opera,console*/
(function () {
     "use strict";
     var require, exports, contexts = {}, baseConfig = {}, logs = [],
     isOpera = typeof opera !== "undefined" && opera.toString() === "[object Opera]",
     baseScript = null,
     checkdepsLoadedTimerId = 0,     
     head=window?window.document.getElementsByTagName("head")[0]:null,
     currentlyAddingScript,
     useInteractive = false,
     req = {},
     childIndex=0,
     childLength=0,
     childNode,
     bpath,
     exp,
     isDebug,
     bootModId,
     fn={},
     module = function (id,deps,factory) { },
     log = {
         debuggerPanel: null,
         appendmsg: function (msg, type) {
             logs.push(type + ':' + msg);
             //var msg=document.createElement("div");
             //msg.innerText=msg;
             //this.debuggerPanel.appendChild(msg);
         },
         error: function (msg) {
             if (console !== undefined) {
                 console.error(msg);
             }
             this.appendmsg(msg, 'error');
         },
         info: function (msg) {
             if (!baseConfig.debug) {
                 return;
             }
             if (console !== undefined) { console.info(msg); }

             this.appendmsg(msg, 'info');
         },
         //assert:function(exp){if(!baseConfig.debug || window.console===undefined){return;}; window.console.assert(exp);},

         attachTo: function () {
             if (!baseConfig.debug) { return; }

             var win = window.document.createElement("div");
             win.setAttribute('id', 'debuggerPanel');

             window.document.body.appendChild(win);
             this.debuggerPanel = win;
         }



     },
     pathParse = function (path, type) {
         if (!type) {

             type = "js";

         }
         var url = "";
         if (path.indexOf('.') === 0) {
             url = path;
         }
         else {
             path = path.replace(/\./g, '/');
             url = baseConfig.basePath + path + "." + type;
         }
         return url;


     },
     newContext = function (name) {

         var c = {
             contextName: name,
             urlFetched: {},
             loaded: {},
             defined: {},
             prerun: [],
             runed: {},
             startTime: new Date(),
             scriptCount: 0,
             modules: {}
         };
         contexts[name] = c;
     };
     if(head)
     {
	 for (childLength=head.childNodes.length;childIndex<childLength;childIndex++) {
             childNode = head.childNodes[childIndex];
             if (childNode.getAttribute && childNode.getAttribute('src')) {
		 if (childNode.getAttribute('src').indexOf('base.js') === 0 || childNode.getAttribute('src').indexOf('/base.js') > 0) {
                     baseScript = childNode;
                     break;
		 }
             }
	 }
     }
     if (baseScript !== null) {

         bpath = baseScript.getAttribute('base-path');
         baseConfig.basePath = bpath || './';
         exp = baseScript.getAttribute('base-expired');
         baseConfig.expired = exp || 5;
         isDebug = baseScript.getAttribute('base-debug');
         baseConfig.debug = isDebug === 'true' ? true : false;
	 bootModId=baseScript.getAttribute('base-boot');
	 baseConfig.bootModId=bootModId;	 

     }
     
     // log.attachTo();
     log.info('config:');
     log.info(baseConfig);
     newContext("base");
     exports = {};

     req.onScriptLoad = function (oScript) {
         //IE
         if (oScript.attachEvent && !isOpera) {
             if (!oScript.readyState ||
		 oScript.readyState === "loaded" || oScript.readyState === "complete") {
                 req.setScriptLoad(oScript);
                 // Handle memory leak in IE
                 oScript.onreadystatechange = null;
                 
             }
         }
         else {
             req.setScriptLoad(oScript);
         }

     };

     req.run=function(oModule){
	 var i,len,canBeRun=true,context = contexts.base,deps=oModule.deps;
	 for(i=0,len=deps.length;i<len;i++){
	     if(context.runed[deps[i]]!==true){
		 req.run(context.defined[deps[i]]);
	     }
	 }
	 req.exec(context,oModule.id);
     };

     req.setScriptLoad = function (oScript) {

         var contextname = oScript.attributes['data-context'].value,
         context = contexts[contextname],
         modulename = oScript.attributes['data-modulename'].value,
	 modname,
	 result,
	 filterCondition=function (name) { return (name !== modname); };
	 if(contexts.base.defined[modulename]===undefined){
	     return;
	 }
         log.info('loaded:' + modulename);
         context.loaded[modulename] = true;
         context.scriptCount--;

         if (context.scriptCount === 0) {
             log.info('--------------start execute callback function------------');
	     req.run(context.defined[baseConfig.bootModId]);
         }
	 head.removeChild(oScript);
     };


     req.exec = function (context, modname) {
         if (context.runed.hasOwnProperty(modname)) {
             return true;
         }
         var args = [],
         mod = context.defined[modname],
	 i,len,
	 modid;
         if (!mod) {
	     context.runed[modname] = true;
             return true;
         }
         if (mod.deps) {
             for (i = 0,len=mod.deps.length; i < len; i++) {
		 modid = mod.deps[i]; 
                 if (context.runed[modid] === undefined || context.runed[modid] === false) {
		     log.error(modid+" is undefined");
                     return false;
                 }
                 args.push(exports[modid]);
             }
         }
	 
         exports[modname] = mod.exc.apply(null, args);
         context.runed[mod.id] = true;
	 log.info('call ' + modname + ' factory function');
         return true;


     };
     req.attach = function (url, contextName, moduleName, callback, type, isAsync) {
         var oScript;
         callback = callback || req.onScriptLoad;
         oScript = window.document.createElement("script");
         oScript.type = type || "text/javascript";
         oScript.charset = "utf-8";

         oScript.async = isAsync; //!s.skipAsync[url];

         oScript.setAttribute("data-context", contextName);
         oScript.setAttribute("data-modulename", moduleName);


         if (oScript.attachEvent && !isOpera) {
             useInteractive = true;
             oScript.attachEvent("onreadystatechange", function () { callback.apply(null, [oScript]); });
         } else {
             oScript.addEventListener("load", function () { callback.apply(null, [oScript]); }, false);
         }
         oScript.src = url;

         currentlyAddingScript = oScript;        
         head.appendChild(oScript);         
         currentlyAddingScript = null;
         return oScript;


     };
     
     req.checkdepsLoaded = function (context) {
         log.info("running checkdepsLoaded");
         var isAllLoaded = true,
	 prop,
         unloaded = [],
         expired = (baseConfig.expired * 1000 + context.startTime) < new Date().getTime(),
         loaded = context.loaded;
         for (prop in loaded) {
	     if(loaded.hasOwnProperty(prop) && loaded[prop]===false){
		 isAllLoaded = false;
                 unloaded.push(prop);
                 break;
	     }
         }
         if (expired && context.scriptCount > 0) {
             log.error(isAllLoaded + ' loading expired');
             //alert('loading expired');
             return;

         }
         if (!expired && !isAllLoaded && !checkdepsLoadedTimerId) {
             checkdepsLoadedTimerId = window.setTimeout(function () {
							    checkdepsLoadedTimerId = 0;
							    req.checkdepsLoaded(context);
							}, 50);
             return;
         }

     };


     req.load = function (context, moduleName, url, isAsync) {


         var contextName = context.contextName,
         urlFetched = context.urlFetched,
         loaded = context.loaded;

         if (!loaded[moduleName]) {
             loaded[moduleName] = false;
         }

         if (!urlFetched[url]) {
             context.scriptCount += 1;
             log.info('loading module:' + moduleName + "; url:" + url + ";total:" + context.scriptCount);
             if (isAsync === null || isAsync === undefined) {
                 isAsync = true;
             }
             context.startTime = (new Date()).getTime();
             req.attach(url, contextName, moduleName, null, null, isAsync);
             urlFetched[url] = true;
         }

         req.checkdepsLoaded(context);
     };

     



     fn.define = function (modId, modDeps, modFactory) {
         var context = contexts.base, id, deps, factory,i,len,modName,areDepsLoaded=true,areRuned=true,oMod;

         if (arguments.length === 1) {
             id = modId;
             deps = null;
             factory = modId;
         }
         else if (arguments.length === 2) {
             if (typeof modId === 'string') {
                 id = modId;
                 deps = null;
                 factory = modDeps;
             }
             else if (typeof modId === 'object') {
                 id = modDeps;
                 deps = modId;
                 factory = modDeps;
             }
         }
         else {
             id = modId;
             deps =modDeps;
             factory = modFactory;
         }
	 if(factory===undefined||factory===null)
	 {
	     throw "factory was undefined in define function";
	 }
         if (context.defined.hasOwnProperty(id)) {

             return;
         }
	 deps=(deps===null||deps===undefined)?[]:deps;
	 oMod={
             id: id,
             deps:deps,
             exc: factory
         };
         context.defined[id] = oMod;
         log.info("define:" + id);

	 for(i=0,len=deps.length;i<len;i++){
	     modName = deps[i];
             if (!(context.defined.hasOwnProperty(modName)||context.loaded.hasOwnProperty(modName))) {
		 areDepsLoaded=false;
                 req.load(context, modName, pathParse(modName));		     
             }
	 }
	 if(areDepsLoaded)
	 {
	     for(i=0,len=deps.length;i<len;i++){
		 if(context.runed[deps[i]]!==true){
		     areRuned=false;
		     break;
		 }
	     }
	     if(areRuned)
	     {
		 req.run(oMod);
	     }
	 }
     };

     fn.require = function (deps) {
         log.info("require:" + deps);
         var context = contexts.base,i,len;

         if (typeof deps === "string") {
             req.load(context, deps, pathParse(deps), true);
         }
         else {
             for (i = 0,len=deps.length; i < len; i++) {
                 req.load(context, deps[i], pathParse(deps[i]), true);
             }
         }

     };
     fn.loadBaseExtend=function(id,callback){
	 var temps,i,len,path=id+".js";
	 temps=baseScript.getAttribute('src').split('/');
	 for(len=0,i=temps.length-2;i>len;i--)
	 {
	     path=temps[i]+'/'+path;
	 }
	 req.attach(path,'dev',id,callback,null, true);
     };
     if(window!==undefined)
     {
	 window.define = fn.define;
	 window.define.console = log;
	 window.require = require;
	 if (baseConfig.debug) {
	     window.dev={};
             window.dev.exports = exports;
             window.dev.contexts = contexts;
	     window.dev.log=log;
             window.dev.config = baseConfig;
             window.dev.logs = logs;
	     fn.loadBaseExtend('devtools',function(){
				   log.info('loaded devtools');
			       });
	     fn.require(baseConfig.bootModId);
	 }
     }
 }());
