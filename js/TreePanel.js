/*
Drag-and-drop notes:

I didn't find the specifics of the Sidora requirements to lend itself well to using ExtJS.
I feel this may be due to the lack of knowledge about how the selection model works in an ExtJS
tree.  I was not able to find a suitable example of multi-select in the tree and drag-and-drop,
so here we see a combination of jQuery and ExtJS.

The "additional" selections for the drag-and-drop happens fully based on jQuery, using the
sidoraTreeMultiSelect class both to highlight for the UI and as a selection methodology
for the eventual drop.

The best "full" ExtJS drag and drop tree I found was located here:
http://www.users.on.net/~clear/ext/index.html
but there were some fundamental differences, there is no rearranging in Sidora
and there was no copy option.  I felt that rather than taking on a non-Sencha
product and not only possibly having bugs in it, there would be little 
available on how other devs used it, and I would have to alter the code in ways the original
author was not expecting, possibly leading to more bugs.

If we have the requirement to rearrange and continue to stay with ExtJS, a rewrite
using the above library may be a good idea.
*/
Ext.define('ContentModelViewer.widgets.TreePanel', {
  extend: 'Ext.tree.Panel',
  constructor: function (config) {
    this.callParent(arguments);
  },
  id: 'cmvtreepanel',
  viewConfig : {
    selectedItemCls : "even",
        // plugins : {
            //SFOX disable drag n drop for now
            //ptype: 'treeviewdragdrop',
            //ddGroup: 'cmvDDGroup',
        //},
    listeners: {
      itemmousedown: {
        fn: function (view, record, item, index, event) {
          jQuery(".x-dd-drop-icon").addClass("sidoraDDIcon");
          window.bm = null; //reset the batch metadata process (user cancelled out of it, essentially)
        }
      },

      beforedrop: {
        fn: function(node, data, overModel, dropPos, opts) {
          //Get the current user selection so that it can be reapplied after the tree changes (which deselects)
                    //SFOX disable drag n drop for now
                    //var isDraggingResources = true;
                    //var isDraggingConcepts = false;
          var userSelectionStorage = Ext.getCmp('cmvtreepanel').getSelectionModel().getSelection();
          var userSelectionStorageParent = null;
          if (userSelectionStorage.length > 0){
            userSelectionStorageParent = userSelectionStorage[0].parentNode;
          }
                    //SFOX disable drag n drop for now
                    //var dropPid = overModel.get('pid');
          var resourcePids = getSelected();
          var conceptPids = getTreeSelected();
                    //SFOX disable drag n drop for now
                    //var trueDraggedPid = data.records[0].data.pid;
          //if the trueDraggedPid is in the resourcePids, then it's a resource to tree drag, otherwise it's a tree to tree drag
                    //SFOX disable drag n drop for now
                    //var dragPids = resourcePids;
          var parentPids = ContentModelViewer.properties.pids.concept;
                    //SFOX changed from resource
                    //SFOX disable drag n drop for now
                    //var draggedTypeName = "data component(s)";
          var additionalMessage = "";
                    //SFOX disable drag n drop for now
/*                    
          if (resourcePids.indexOf(trueDraggedPid) == -1){
             isDraggingConcepts = true;
             isDraggingResources = false;
             dragPids = conceptPids;
                        //SFOX changed from concept
                        draggedTypeName = "class(es)";
             parentPids = getTreeSelectedParents();
             //Check to see if the concept is dragged to its current parent
             var selectedThatHaveParentAsDropTarget = getTreeSelected(true,null,dropPid);
             if (selectedThatHaveParentAsDropTarget.length > 0){
               var conceptNamesList = "";
               for(var sthpdti = 0; sthpdti < selectedThatHaveParentAsDropTarget.length; sthpdti++){
                  if (sthpdti != 0) conceptNamesList += ", ";
                  conceptNamesList += Ext.getCmp('cmvtreepanel').getNodesByPid(selectedThatHaveParentAsDropTarget[sthpdti])[0].get('text');
               } 
                            //
                             //Ext.Msg.alert(
                             //'Dragged to current parent',
                             //'The following concepts:' + conceptNamesList + ' already have ' + Ext.getCmp('cmvtreepanel').getNodesByPid(dropPid)[0].get('text') + ' as a parent and do not need to be associated again'
                             //);
                             //
               //ExtJS is not set up to have multiple alerts per user action, so couldn't easily set up what Beth wanted with an alert before the move wording.
               additionalMessage = 'The following concepts:' + conceptNamesList + ' already have ' + Ext.getCmp('cmvtreepanel').getNodesByPid(dropPid)[0].get('text') + ' as a parent and do not need to be associated again.<br/><br/>';
               dragPids = getTreeSelected(false,dropPid);
               parentPids = getTreeSelectedParents(false,dropPid);
               if (dragPids == ""){
                 //All of the ones dragged had the drop target as the current parent.  Don't bother going further
                 Ext.Msg.alert(
                   'Dragged to current parent',
                   'The following concepts:' + conceptNamesList + ' already have ' + Ext.getCmp('cmvtreepanel').getNodesByPid(dropPid)[0].get('text') + ' as a parent and do not need to be associated again'
                 );
                 return false;
               }
             }
          }
            
          
          var dropLabel = overModel.get('text');
          var dragLabels = "";
          var dragPidThenLabelWithBr = "";
          if (isDraggingConcepts){
            dpArray = dragPids.split(",");
            for (dpi = 0; dpi < dpArray.length; dpi++){
              if (dragLabels != "") dragLabels += ",";
              dragLabels += Ext.getCmp('cmvtreepanel').getNodesByPid(dpArray[dpi])[0].get('text');
              if (dragPidThenLabelWithBr != "") dragPidThenLabelWithBr += "<br>";
              dragPidThenLabelWithBr += dpArray[dpi] + ' - ' +Ext.getCmp('cmvtreepanel').getNodesByPid(dpArray[dpi])[0].get('text');
            }
          }
          if (isDraggingResources){
             dragPidThenLabelWithBr = getSelectedWithLabels(); 
          }
          if (window.modifierKeysHeld.shift){
            //var outputMessage =  additionalMessage + 'Are you sure you want to associate (copy) the selected '+draggedTypeName+':<br>'+dragPids+'<br> to <br>' + dropPid + ' - ' + dropLabel;
            var outputMessage = additionalMessage + 'Are you sure you want to associate (copy) the selected '+draggedTypeName+':<br>'+dragPidThenLabelWithBr+ ' <br> to <br>' +  dropPid + ' - ' + dropLabel;
            Ext.Msg.show({
              title:'Copy '+draggedTypeName,
              msg: outputMessage,
              buttons: Ext.Msg.YESNO,
              fn: function(choice) {
                if (choice == 'yes'){
                  jQuery.ajax({
                        url: Drupal.settings.basePath+"viewer/"+dropPid+"/associate/"+dragPids,
                        success: function(responseText){
                          successfulHttpOnCopyOrMove(responseText, 'Copy', null, dragPids, dropPid, userSelectionStorageParent, userSelectionStorage);
                        },error: function(errorStuff){
                          Ext.Msg.alert("Got a HTTP error, maybe the ID was incorrect?");
                        }
                  });
                }
              }
            });
          }else{
            //var outputMessage =  additionalMessage + 'Are you sure you want to move the selected '+draggedTypeName+':<br>'+dragPids+'<br> to <br>' + dropPid + ' - ' + dropLabel;
            var outputMessage =  additionalMessage + 'Are you sure you want to move the selected '+draggedTypeName+':<br>'+dragPidThenLabelWithBr+ ' <br> to <br>' +  dropPid + ' - ' + dropLabel;
            Ext.Msg.show({
              title:'Move '+draggedTypeName,
              msg: outputMessage, 
              buttons: Ext.Msg.YESNO,
              fn: function(choice) {
                if (choice == 'yes'){
                  jQuery.ajax({
                        url: Drupal.settings.basePath+"viewer/source/"+parentPids+"/dest/"+dropPid+"/move/"+dragPids,
                        success: function(responseText){
                          successfulHttpOnCopyOrMove(responseText, 'Move', parentPids, dragPids, dropPid, userSelectionStorageParent, userSelectionStorage);
                        },error: function(errorStuff){
                          Ext.Msg.alert("Got a HTTP error, maybe the ID was incorrect?");
                        }
                  });

                }
              }
            });
          }
*/                    
          //Set the selection:
          Ext.getCmp('cmvtreepanel').getSelectionModel().select(userSelectionStorageParent);
          Ext.getCmp('cmvtreepanel').getSelectionModel().select(userSelectionStorage);
          this.droppedRecords = data.records;  //Not currently used, if you wanted to relook at the record dropped
          data.records = [];
        }
      }
    }
  },
  region: 'west',
  folderSort: false,
  store: 'treemembers',
  autoLoad: false,
  root: 'data',
  rootVisible: true,
  collapsible: true,
  collapseDirection: 'left',
  title: 'Projects',
  width: 250,
  useArrows: true,
  multiSelect: true,
  getNodesByPid: function (pid) {
    var nodes = [],
      root = this.store.getRootNode(),
      cascadeFunc = function (n) {
        if (n.get('pid') === pid) {
          nodes.push(n);
        }
        return true;
      };
    if (typeof (pid) === 'string' && pid.length > 0) {
      root.cascadeBy(cascadeFunc);
    }
    return nodes;
  },
  getParentNodesByPid: function (pid) {
    var parent = null,
      parents = [],
      nodes = this.getNodesByPid(pid),
      i = 0;
    for (i = 0; i < nodes.length; i += 1) {
      parent = nodes[i].parentNode;
      if (parent !== null) {
        parents.push(parent);
      }
    }
    return parents;
  },
  loadNodes: function (nodes) {
    var node, i;
    for (i = 0; i < nodes.length; i += 1) {
      node = nodes[i];
      this.refreshNodes(node.get('pid'));
    }
  },
  loadPid: function (pid) {
    if (typeof (pid) === 'string' && pid.length > 0) {
      this.store.load({ 
          url: ContentModelViewer.properties.url.object.treemembers(pid),
          success: function (response) {
          }
      });
    }
  },
  refreshChildren: function (pid) {
    if (pid !== undefined) {
      if (pid === ContentModelViewer.properties.root) {
        this.loadPid(pid);
      } else {
        this.store.load({
          url: ContentModelViewer.properties.url.object.treemembers(pid),
          success: function (response) {
          }
        });
      }
    }
  },
  refreshParents: function (pid) {
    if (pid !== undefined) {
      this.loadNodes(this.getParentNodesByPid(pid));
    }
  },
  refreshNodes: function (pid) {
    var nodes = this.getNodesByPid(pid);
    if (nodes.length > 0) {
      Ext.Ajax.request({
        url: ContentModelViewer.properties.url.object.treemember(pid),
        success: function (response) {
          var responseData, children, node, i;
          responseData = JSON.parse(response.responseText);
          children = responseData.data;
          for (i = 0; i < nodes.length; i += 1) {
            node = nodes[i];
            node.removeAll();
            if (children !== null) {
              node.appendChild(children);
            }
            node.set('text', responseData.parents.label);
            node.set('leaf', false); // May have added a child.
            node.commit();
          }
          treeRefreshed();
        }
      });
    }
  },

  removeChildFromParent: function (object_pid, parent_pid) {
    var parents, parent, child, i;
    parents = this.getNodesByPid(parent_pid);
    for (i = 0; i < parents.length; i += 1) {
      parent = parents[i];
      child = parent.findChild('pid', object_pid);
      while (child !== null) {
        parent.removeChild(child, true);
        child = parent.findChild('pid', object_pid);
      }
    }
  },
  listeners: {
      beforeload: function(tree, eOpts){
        this.getEl().mask();
      },
      load: function(tree, eOpts){
        this.getEl().unmask();
      },
    itemmouseup: {
      fn: function (view, record, item, index, event) {
                //SFOX disable drag n drop for now
                //updateDragIndicatorText();
        if (!window.modifierKeysHeld.ctrl){
          //Would like to remove sidoraTreeMultiSelect from all, but this gets fired before
          //the drop item, so if you remove the class here then drop item won't get it.
          //One solution may be to remove multiselect in a setTimeout if the following becomes an issue:
          //One would expect the deselection of items if you click directly on one of the items of the
          //tree, including an item that is already highlighted.  This does not occur if you click a highlighted
          //item
          if (jQuery(item).hasClass("sidoraTreeMultiSelect")){
            jQuery(".sidoraTreeMultiSelect").removeClass("sidoraTreeMultiSelect"); 
            Ext.getCmp('cmvtreepanel').getSelectionModel().select(item);
            jQuery(item).addClass("x-grid-row-focused");
            var pid = record.get('pid');
            if (record.data.id === 'root') {
              if (ContentModelViewer.properties.siUser) {
                pid = ContentModelViewer.properties.siUser;
              } else {
                                pid = 'fba:root';
              }
            }
            ContentModelViewer.functions.selectConcept(pid);
          }
        }
        updateDragIndicatorText();
      }
    },
    itemmousedown: {
      fn: function (view, record, item, index, event) {
        //TODO: TBD: reselect what got unselected
        jQuery(".x-dd-drop-icon").addClass("sidoraDDIcon");
        if (record.parentNode) jQuery(item).attr("parentpid",record.parentNode.get('pid'));
        jQuery(item).attr("pid",record.get('pid')); //ExtJS became too cumbersome to try and get back and forth between tree node and data
        //Perhaps there is an easy way to get the data from the tree when only having the DOM object? I did not find it, assumed starting from
        //the tree view since that is the connection between the DOM and the ExtJS store but couldn't find anything simple -- e.g. only get all
        //nodes and compare against store by using
        //Ext.getCmp('cmvtreepanel').view.getStore().getAt( i )
        //Ext.getCmp('cmvtreepanel').view.getStore().getAt( i ).id
        //and
        //Ext.getCmp('cmvtreepanel').view.all.elements[ j ]
        //Ext.getCmp('cmvtreepanel').view.all.elements[ j ].viewRecordId
        //so for ease of use, decided to store the pid in the DOM as attribute
        if (window.modifierKeysHeld.ctrl){
          jQuery(item).toggleClass("sidoraTreeMultiSelect");
          updateDragIndicatorText();
          return false;
        }else{
          //if looking to drag a selected item, don't deselect stuff
          if (jQuery(item).hasClass("sidoraTreeMultiSelect")){
            jQuery(item).removeClass("sidoraTreeMultiSelect");
            var a = Ext.getCmp('cmvtreepanel').view.getNode(Ext.getCmp('cmvtreepanel').getSelectionModel().getSelection()[0]);
            //index zero is the old selected
            jQuery(a).addClass("sidoraTreeMultiSelect");
          }else{
            var allSelected =  Ext.getCmp('cmvtreepanel').getSelectionModel().getSelection();
            var resetMultiSelect = true;
            for(var i=0;i<allSelected.length;i++){
              if (record == Ext.getCmp('cmvtreepanel').getSelectionModel().getSelection()[i]){
                resetMultiSelect = false;
              }
            }
            if (resetMultiSelect) jQuery(".sidoraTreeMultiSelect").removeClass("sidoraTreeMultiSelect");
          }
                    //SFOX disable drag n drop for now
                    //updateDragIndicatorText();
        }
          var pid = record.get('pid');
          if (record.data.id === 'root') {
            if (ContentModelViewer.properties.siUser) {
              pid = ContentModelViewer.properties.siUser;
            } else {
                        pid = 'fba:root';
            }
          }
          ContentModelViewer.functions.selectConcept(pid);
      }
    }
  }
});
function successfulHttpOnCopyOrMove(responseText, copyOrMoveText, parentPids, dragPids, dropPid, userSelectionStorageParent, userSelectionStorage){
  response = JSON.parse(responseText);
  if (!response.success){
    responseAlert(copyOrMoveText+' problem',response);
  }

  ContentModelViewer.functions.selectConcept();
  toUpdate = dragPids.split(",");
  for (var tui = 0; tui < toUpdate.length; tui++){
    ContentModelViewer.functions.refreshTreeParents(toUpdate[tui]);
  }
  if (parentPids != null){
    toUpdate = parentPids.split(",");
    for (var tui = 0; tui < toUpdate.length; tui++){
      ContentModelViewer.functions.refreshTreeNodes(toUpdate[tui]);
    }
  }
  ContentModelViewer.functions.refreshTreeNodes(dropPid);
  if (typeof(window.refreshLatency) == 'undefined'){
    window.refreshLatency = 2000;
  }
  
  treeRefreshed = (function(){
    
    //If something is already selected validly in the tree, don't change it?
    //if (Ext.getCmp('cmvtreepanel').getSelectionModel().getSelection().length > 0 && Ext.getCmp('cmvtreepanel').getSelectionModel().getSelection()[0].parentNode != null) return;
 
    
    //See if there is an item that has the pid and has the dropPid as a parent
    possibleTargets = Ext.getCmp('cmvtreepanel').getNodesByPid(userSelectionStorage[0].get("pid"));
    var finalTarget = null;
    for (i = 0; i < possibleTargets.length; i++){
      if (possibleTargets[i].parentNode.get("pid") == dropPid){
        finalTarget = possibleTargets[i];
      }
    }
    if (finalTarget != null && response.success){ //if the move/copy failed, don't select the one that is in the dragged pid (e.g. failed because it was already there)
      Ext.getCmp('cmvtreepanel').getSelectionModel().select(finalTarget);
    }else{
      //if we couldn't find anything, do the initial parent and then the initial selection
      Ext.getCmp('cmvtreepanel').getSelectionModel().select(userSelectionStorageParent);
      //Dont try to select the thing that moved (it's gone) and leave it at the parent
      if (userSelectionStorage.length > 0 && userSelectionStorage[0].parentNode != null){
        Ext.getCmp('cmvtreepanel').getSelectionModel().select(userSelectionStorage);
      }
    }
    if(Ext.getCmp('cmvtreepanel').getSelectionModel().getSelection().length == 0 || Ext.getCmp('cmvtreepanel').getSelectionModel().getSelection()[0].parentNode == null){ //check to see if there is a "selected" node
      //If nothing else, at least select the thing that has the pid of the last selected item
      Ext.getCmp('cmvtreepanel').getSelectionModel().select(Ext.getCmp('cmvtreepanel').getNodesByPid(Ext.getCmp('cmvtreepanel').getSelectionModel().getSelection()[0].get("pid")));
    }
    //If the item does appear anywhere in the current tree that "should" be selected, then select it
    var nodesThatAreProper = Ext.getCmp('cmvtreepanel').getNodesByPid(ContentModelViewer.properties.pids.concept);
    if (nodesThatAreProper.length > 0 && ContentModelViewer.properties.pids.concept !=  Ext.getCmp('cmvtreepanel').getSelectionModel().getSelection()[0].get("pid")){
       Ext.getCmp('cmvtreepanel').getSelectionModel().select(nodesThatAreProper[0]);
    }
  });//,window.refreshLatency);
}

/*
* Updates the text on the drag item when moving within the Tree
*/
function updateDragIndicatorText(){
  setTimeout(function(){
  var tsn = getTreeSelected(true,null,null);
  if (jQuery("#sidoraDragText").length == 0){
    jQuery("#cmvtreepanel-body-drag-status-proxy-ghost").before("<div id='sidoraDragText' class='sidora-dd-drag-ghost'>sidoraDragText</div>");
  }
  jQuery("#sidoraDragText").text(tsn.length+" items selected ");
  if (tsn.length == 1) jQuery("#sidoraDragText").text("1 item selected ");
  },200);
}


/*
* This will tell us whether to include the "true" selected pid in the returns from getTreeSelectedParents and getTreeSelected
* the "true" selected pid is the one that extjs thinks is selected
*/
function isTrueSelectedPartOfSidoraTreeMultiSelect(){
  var trueSelectedParentPid = Ext.getCmp('cmvtreepanel').view.getSelectedNodes()[0].getAttribute("parentpid");
  var trueSelectedPid = Ext.getCmp('cmvtreepanel').view.getSelectedNodes()[0].getAttribute("pid");
  var additionalSelected = jQuery(".sidoraTreeMultiSelect");
  for(var i = 0; i < additionalSelected.length; i++){
    var selectedPid = jQuery(additionalSelected[i]).attr("pid");
    var selectedParentPid = jQuery(additionalSelected[i]).attr("parentpid");
    if (selectedPid == trueSelectedPid && selectedParentPid == trueSelectedParentPid) return true;
  }
  return false;
}
function getTreeSelectedParents(returnAsArray, excludePid){
  var toReturn = [];
  if (Ext.getCmp('cmvtreepanel').view.getSelectedNodes().length == 0) return toReturn; //No initial selection has been made
  var trueSelectedParentPid = Ext.getCmp('cmvtreepanel').view.getSelectedNodes()[0].getAttribute("parentpid");
  if (trueSelectedParentPid != excludePid && !isTrueSelectedPartOfSidoraTreeMultiSelect()) toReturn.push(trueSelectedParentPid);
  var additionalSelected = jQuery(".sidoraTreeMultiSelect");
  for(var i = 0; i < additionalSelected.length; i++){
    var selectedParentPid = jQuery(additionalSelected[i]).attr("parentpid");
    if (selectedParentPid != excludePid) toReturn.push(selectedParentPid);
  }
  if (returnAsArray == true){
    return toReturn;
  }
  return toReturn.join(",");
}
/*
* The first item returned in the array is the pid of the selected node that is shown in the right panel
*
*/
function getTreeSelected(returnAsArray, excludeWithParentPid, onlyIncludeWithParentPid){
  var toReturn = [];
  if (Ext.getCmp('cmvtreepanel').view.getSelectedNodes().length == 0) return toReturn; //No initial selection has been made
  if (Ext.getCmp('cmvtreepanel').view.getSelectedNodes()[0] == null) return toReturn; //Don't know how this happens, Beth got this
  var trueSelectedPid = Ext.getCmp('cmvtreepanel').view.getSelectedNodes()[0].getAttribute("pid");
  var trueSelectedParentPid = Ext.getCmp('cmvtreepanel').view.getSelectedNodes()[0].getAttribute("parentpid");
  if (trueSelectedParentPid == excludeWithParentPid || isTrueSelectedPartOfSidoraTreeMultiSelect()){
    //Don't include it, specifically excluded or dealt with in the sidoraTreeMultiSelect loop
  }else{
     if (typeof(onlyIncludeWithParentPid) == 'undefined' || onlyIncludeWithParentPid == null){
      //Include it, not excluded and there's no specific parent to worry about
      toReturn.push(trueSelectedPid);
    }else if (trueSelectedParentPid == onlyIncludeWithParentPid){
      //Include because it has the parent we are worrying about
      toReturn.push(trueSelectedPid);
    }
  }
  var additionalSelected = jQuery(".sidoraTreeMultiSelect");
  for(var i = 0; i < additionalSelected.length; i++){
    var selectedPid = jQuery(additionalSelected[i]).attr("pid");
    var selectedParentPid = jQuery(additionalSelected[i]).attr("parentpid");
    if (selectedParentPid == excludeWithParentPid){
      //Don't include it, specifically excluded
    }else{
       if (typeof(onlyIncludeWithParentPid) == 'undefined' || onlyIncludeWithParentPid == null){
        //Include it, not excluded and there's no specific parent to worry about
        toReturn.push(selectedPid);
      }else if (selectedParentPid == onlyIncludeWithParentPid){
        //Include because it has the parent we are worrying about
        toReturn.push(selectedPid);
      }
    }
  }
  if (returnAsArray == true){
    return toReturn;
  }
  return toReturn.join(",");
}
function responseAlert(userReadableErrorType, response){
  var fullMessage = "";
  var msgs = getMessageArray(response.msg);
  fullMessage += msgs.join("<br/>");
  if (typeof(response.suboperations) != 'undefined'){
    for (var csoi = 0; csoi < response.suboperations.length; csoi++){
      if (response.suboperations[csoi] != null){
        msgs = getMessageArray(response.suboperations[csoi].msg);
        fullMessage += msgs.join("<br/>");
      }
    }
  }
  Ext.Msg.alert('Status',userReadableErrorType+': '+fullMessage);
}
function getMessageArray(msg){
  var toReturn = [];
  if (typeof(msg) != 'undefined' && msg != null && typeof(msg.length) == 'number'){
    for (var mi = 0; mi < msg.length; mi++){
      if (typeof(msg[mi].message) != 'undefined' && msg[mi].message != null){
        toReturn.push(msg[mi].message);
      }
    }
  }
  return toReturn;
}
function treeRefreshed(){
}
window.modifierKeysHeld = new Object();
window.modifierKeysHeld.shift = false;
window.modifierKeysHeld.ctrl = false;
$(document).keydown(function (e) {
    if (e.keyCode == 16) {
      $(".sidoraDDIcon").addClass("sidoraDDCopy");
      modifierKeysHeld.shift = true;
    }
    if (e.keyCode == 17) {
      modifierKeysHeld.ctrl = true;
    }  
});
$(document).mousedown(function (e) {
    jQuery(".x-dd-drop-icon").addClass("sidoraDDIcon");
});
$(document).keyup(function (e) {
    if (e.keyCode == 16) {
      $(".sidoraDDIcon").removeClass("sidoraDDCopy");
      modifierKeysHeld.shift = false;
    }
    if (e.keyCode == 17) {
      modifierKeysHeld.ctrl = false;
    }  
});
