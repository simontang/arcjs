/*global window*/

(function(dev){
     "use strict";

     var fn={},
     log=dev.log,
     sVar,
     aVars=[],
     oRelVars={},
     contexts=dev.contexts;

     fn.createDepsMap=function(){
	 contexts.base.modCallstack={};
	 var defined,
	 tempmods,
	 roots,
	 key,
	 deps,
	 dep,
	 i,
	 len,
	 modName,
	 ExistItem,
	 node,
	 sParentId,
	 oResolved={},
	 oUnResolved={},
	 nodeWith=200,
	 nodeHeight=60,
	 xMaps=[],
	 createModNode=function(oModule,oParent){
	     var node={},child,i,len;
	     if(!contexts.base.modCallstack.hasOwnProperty(oModule.id)){
		 node.id=oModule.id;
		 node.width=nodeWith;
		 node.height=nodeHeight;
		 node.x=-1;
		 node.y=-1;
		 node.childs=[];
		 node.parents=[];
		 contexts.base.modCallstack[node.id]=node;
	     }
	     else
	     {
		 node=contexts.base.modCallstack[oModule.id];
	     }
	     oUnResolved[node.id]=0;
	     sParentId=oParent!==undefined?oParent.id:'indexpage';
	     log.info(sParentId+'-->'+oModule.id);
	     if(oParent!==undefined&&node.parents.indexOf(oParent)===-1){
		 node.parents.push(oParent);
	     }
	     node.getXIndex=function(){
		 if(this.x===-1)
		 {
		     log.info('get '+this.id+' Xindex');
		     var depth=0,i,len,temp,xindex=0;
		   /*  for(i=0,len=this.parents.length;i<len;i++){
			 temp=this.parents[i].getYIndex();
			 if(temp>=depth){
			     xindex=this.parents[i].childs.indexOf(this)+this.parents[i].getXIndex();
			 }
		     }
		    */
		     depth=this.getYIndex();
		     if(xMaps[depth]===undefined){
			 xMaps[depth]=0;
		     }
		     else{
			 xMaps[depth]++;
		     }
		     this.x=xMaps[depth];

		 }
		 return this.x;
	     };
	     node.getYIndex=function(){
		 if(this.y===-1)
		 {
		     log.info('get '+this.id+' Yindex');
		     var depth=0,i,len,temp;
		     for(i=0,len=this.parents.length;i<len;i++){
			 temp=this.parents[i].getYIndex();
			 if(temp>=depth){
			     depth=temp+1;
			 }
		     }
		     this.y=depth;
		 }
		 return this.y;
	     };
	     node.getX=function(){return this.width*this.getXIndex()+100;};
	     node.getY=function(){return 2*this.height*this.getYIndex();};
	     if(oModule.deps!==null){
		 for(i=0,len=oModule.deps.length;i<len;i++){
		     dep=oModule.deps[i];
		     if(!oResolved.hasOwnProperty(dep) && oUnResolved.hasOwnProperty(dep)){
			 throw "Circular reference detected: module '"+node.id+"' ---> module '"+dep+"'";
		     }
		     child=createModNode(defined[oModule.deps[i]],node);
		     if(node.childs.indexOf(child)===-1)
			 {
			     node.childs.push(child);
			 }

		 }
	     }
	     oResolved[node.id]=1;
	     delete oUnResolved[node.id];
	     return node;
	 };
	 defined=contexts.base.defined;
	 node=createModNode(defined[dev.config.bootModId]);
	 return node;
     };
     fn.computeTextNode=function(nx,ny,nh,nw){
	 return{
	     x:nx+10,
	     y:ny+nh/2
	 };
     };
     fn.computeLineStartPoint=function(nx,ny,nh,nw){
	 return{x:nx+nw/2,
	       y:ny+nh};
     };
     fn.computeLineEndPoint=function(nx,ny,nh,nw){
	 return{x:nx+nw/2,
	       y:ny};
     };
     fn.drawGraph=function(){
	 var nodeData=fn.createDepsMap(),
	 existNodes={},
	 bDraw,
	 key,
	 oDepth= contexts.base.modCallstack,
	 aTemps=[],
	 svgWidth=0,
	 svgHeight=0,
	 i,len,
	 content="",
	 svgElement,
	 id='bamboo-dev-deps-svg',
	 defs='<defs><linearGradient spreadMethod="pad" y2="0.67578" x2="0.25" y1="0" x1="0" id="svg_4">'
	     +'<stop offset="0" stop-opacity="0.99609" stop-color="#ffffff"/>'
	     +'<stop offset="1" stop-opacity="0.99609" stop-color="#759699"/>'
	     +'</linearGradient>'
	     +'</defs>',
	 getRandomColor = function(){
	     var letters = '0123456789ABCDEF'.split(''),color = '#',i;
	     for(i = 0; i < 6; i++ ) {
		 color += letters[Math.round(Math.random() * 15)];
	     }
	     return color;
	 },
	 hasNode=function(id){
	     if(existNodes.hasOwnProperty(id))
	     {
		 return false;
	     }
	     else
	     {
		 existNodes[id]=1;
		 return true;
	     }
	 },

	 createsvgContent=function(nodeData){
	     var nodeWidth=nodeData.width,nodeHeight=nodeData.height,x,y,x2,y2,node="",depth,index,i,len,childNode,oParent;
	     //	     bDraw=hasNode(nodeData.id);

	     if(nodeData.getX()+nodeWidth>svgWidth){
		 svgWidth=nodeData.getX()+nodeWidth;
	     }
	     if(nodeData.getY()+nodeHeight>svgHeight){
		 svgHeight=nodeData.getY()+nodeHeight;
	     }
	     node='<rect id="'+nodeData.id+'" height="'+nodeHeight+'" width="'+nodeWidth+'"  y="'+nodeData.getY()+'" x="'+nodeData.getX()+'"  stroke-width="1" stroke="#000000" rx="10" fill="url(#svg_4)"/>';
	     x=fn.computeTextNode(nodeData.getX(),nodeData.getY(),nodeHeight,nodeWidth);

	     node+='<text xml:space="preserve" id="'+nodeData.id+'-text" text-anchor="left" font-family="serif" font-size="18"  y="'+x.y+'" x="'+x.x+'" stroke-width="0" stroke="#000000" fill="#000000">'+nodeData.id+'</text>';
	     x2=fn.computeLineEndPoint(nodeData.getX(),nodeData.getY(),nodeHeight,nodeWidth);
	     for(i=0,len=nodeData.parents.length;i<len;i++){
		 oParent=nodeData.parents[i];
		 y=fn.computeLineStartPoint(oParent.getX(),oParent.getY(),nodeHeight,nodeWidth);
		 node+='<line fill="none" parent="'+oParent.id+'" target="'+nodeData.id+'" stroke="'+getRandomColor()+'" stroke-width="2" x1="'+y.x+'" y1="'+y.y+'" x2="'+x2.x+'" y2="'+x2.y+'"/>';
	     }
	     if(len>0)
	     {
		 node+='<circle id="'+nodeData.id+'-circle" stroke="#000000" r="5.10555" cy="'+x2.y+'" cx="'+x2.x+'" stroke-width="0" fill="#020000"/>';
	     }
	     return node;
	 };

	 for(key in oDepth)
	 {
	     if(oDepth.hasOwnProperty(key))
	     {
		 content+=createsvgContent(oDepth[key]);
	     }

	 }
	 svgElement=window.document.getElementById(id);
	 if(svgElement)
	 {
	     window.document.body.removeChild(svgElement);
	 }

	 window.document.body.innerHTML+="<svg id='"+id+"' width='"+svgWidth+"' height='"+svgHeight+"' onmousedown='dev.svgmgr.grab(evt)' onmouseup='dev.svgmgr.dragDown(evt)' onload='dev.svgmgr.init(evt)' onmousemove='dev.svgmgr.move(evt)'>"+ defs+content+"</svg>";
     };
     fn.svgmgr={
	 getTextPoint:fn.computeTextNode,
	 getInLinePoint:fn.computeLineEndPoint,
	 getOuntLinePoint:fn.computeLineStartPoint,
	 trueCoords:{},
	 startPoint:{},
	 target:undefined,
	 textNodePoint:{},
	 textNode:undefined,
	 dotNode:undefined,
	 inLines:[],
	 outLines:[],
	 targetPoint:{ },
	 SVGRoot:undefined,
	 isDrag:false,
	 init:function(evt)
	 {

         this.SVGRoot = window.document.getElementsByTagName('svg')[0];

         this.trueCoords = this.SVGRoot.createSVGPoint();
         this.startPoint = this.SVGRoot.createSVGPoint();
	 },
	 grab:function(evt){
	     if(this.SVGRoot===undefined)
	     {
		 this.init(evt);
	     }
	     this.inLines=[];
	     this.outLines=[];
	     this.dotNode=null;
	     this.target=evt.target;
	     var transMatrix,lines,i=0,lineItem;
	     if(this.target.nodeName ==='rect'){
		 this.isDrag=true;
		 this.textNode=window.document.getElementById(this.target.id+'-text');
		 this.dotNode=window.document.getElementById(this.target.id+'-circle');
		 if(this.dotNode)
		 {
		     this.dotNode.setAttribute('oldcx',this.dotNode.getAttribute('cx'));
		     this.dotNode.setAttribute('oldcy',this.dotNode.getAttribute('cy'));
		 }
		 this.textNodePoint.x=this.textNode.getAttribute('x');
		 this.textNodePoint.y=this.textNode.getAttribute('y');
		 lines=window.document.getElementsByTagName('line');
		 lineItem=lines.item(0);
		 while(lineItem){
		     if(lineItem.getAttribute('target')===this.target.id){
			  lineItem.setAttribute('oldx2',lineItem.getAttribute('x2'));
			  lineItem.setAttribute('oldy2',lineItem.getAttribute('y2'));
			  this.inLines.push(lineItem);

		      }
		     else if(lineItem.getAttribute('parent')===this.target.id)
		     {
			  lineItem.setAttribute('oldx1',lineItem.getAttribute('x1'));
			  lineItem.setAttribute('oldy1',lineItem.getAttribute('y1'));
			  this.outLines.push(lineItem);
		      }
		     lineItem=lines.item(++i);
		 }

		 transMatrix = this.target.getCTM();
		 this.startPoint.x = evt.x;
		 this.startPoint.y = evt.y;
		 this.targetPoint.x = +this.target.getAttribute('x');
		 this.targetPoint.y = +this.target.getAttribute('y');
	     }
	 },
	 getTruePoint:function(evt)
	 {
             var newScale = this.SVGRoot.currentScale,
	     translation = this.SVGRoot.currentTranslate;
             this.trueCoords.x = evt.x;//(evt.clientX - translation.x)/newScale;
             this.trueCoords.y = evt.y;//(evt.clientY - translation.y)/newScale;
	 },
	  move:function(evt){
	      if(this.isDrag){
		  //log.info(evt);
		  this.getTruePoint(evt);
		  var newX = this.trueCoords.x - this.startPoint.x,textNode,inLines,outLines,lines,
		  lineItem,i=0,len,
		  filterinlines=function(item){
		    return item.getAttribute('parent')===this.target.id;
		  },
		  filteroutlines=function(item){
		      return item.getAttribute('node')===this.target.id;
		  },
		  newY = this.trueCoords.y - this.startPoint.y;
		  this.target.setAttribute('x',+this.targetPoint.x+newX);
		  this.target.setAttribute('y',+this.targetPoint.y+newY);
		  this.textNode.setAttribute('x',+this.textNodePoint.x+newX);
		  this.textNode.setAttribute('y',+this.textNodePoint.y+newY);
		  if(this.dotNode)
		  {
		      this.dotNode.setAttribute('cx',+this.dotNode.getAttribute('oldcx')+newX);
		      this.dotNode.setAttribute('cy',+this.dotNode.getAttribute('oldcy')+newY);
		  }
		  for(i=0,len=this.outLines.length;i<len;i++){
		      lineItem=this.outLines[i];
		      lineItem.setAttribute('x1',+lineItem.getAttribute('oldx1')+newX);
		      lineItem.setAttribute('y1',+lineItem.getAttribute('oldy1')+newY);
		  }
		  for(i=0,len=this.inLines.length;i<len;i++){
		      lineItem=this.inLines[i];
		      lineItem.setAttribute('x2',+lineItem.getAttribute('oldx2')+newX);
		      lineItem.setAttribute('y2',+lineItem.getAttribute('oldy2')+newY);
		  }


	      }
	  },
	 dragDown:function(evt){
	     this.isDrag=false;
	 }

     };

     fn.check_global_variable=function(){
	 oRelVars={

	 };
	 var aTemp=[],sv,
	 fnFilter=function(item){
	     if(aVars.indexOf(item)===-1){
		 oRelVars[item]=window[item];
		 return true;
	     }
	     else{
		 return false;
	     }
	 };
	 for(sv in window) {
	     if(window.hasOwnProperty(sv)){
		 aTemp.push(sv);
	     }
	 }
	 aTemp.filter(fnFilter);
	 return oRelVars;
     };
     
     for(sVar in window) {
	 if(window.hasOwnProperty(sVar)){
	     aVars.push(sVar);
	 }
     }

     dev.showDepsMap=fn.createDepsMap;
     dev.checkdep=fn.drawGraph;
     dev.svgmgr=fn.svgmgr;
     dev.check_global_variable=fn.check_global_variable;



}(window.dev));