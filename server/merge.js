/*global require,console,exports,global*/
(function(){
"use strict";

var buildconfig=require('./buildconfig.js').buildconfig,fs=require('fs'),
     oResolved={},
     oUnResolved={};
     global.context={};
     global.context.defined={};
     global.output="";
     console.info(buildconfig);
     global.pathParse = function (path) {

         var url = "",type="js";
         if (path.indexOf('.') === 0) {
             url = path;
         }
         else {
             path = path.replace(/\./g, '/');
             url = buildconfig.basePath + path + "." + type;
         }
         return url;


     };
global.define=function(modId,modDeps,modFactory){
    var id, deps, factory,i,len,modName,areDepsLoaded=true,areRuned=true,oMod,
    path,
    jscontent;

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
    oUnResolved[id]=0;
         if (global.context.defined.hasOwnProperty(id)) {

             return;
         }
	 deps=(deps===null||deps===undefined)?[]:deps;
	 oMod={
             id: id,
             deps:deps,
             exc: factory
         };
    global.context.defined[id]=oMod;
    for(i=0,len=deps.length;i<len;i++){
	modName = deps[i];
	if(!oResolved.hasOwnProperty(modName) && oUnResolved.hasOwnProperty(modName)){
	    throw "Circular reference detected: module '"+id+"' ---> module '"+modName+"'";
	}
	require(global.pathParse(modName));
    }
    oResolved[id]=1;
    delete oUnResolved[id];
    path=global.pathParse(id);
    console.info(path);
    jscontent=fs.readFileSync(path,'utf-8');
    global.output+=jscontent;

};

     require(global.pathParse(buildconfig.bootModId));
     console.info(global.output);
     fs.writeFile(buildconfig.basePath+'alljs.js',global.output,function (err) {
		      if (err) {throw err;}
		      console.log('merge succeed!');
		  });


}());
