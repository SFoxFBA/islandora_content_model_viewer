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
    plugins: {
      ptype: 'treeviewdragdrop',
     ddGroup: 'cmvDDGroup'
    },
    listeners: {
      itemmousedown: {
        fn: function (view, record, item, index, event) {
          jQuery(".x-dd-drop-icon").addClass("sidoraDDIcon");
        }
      },

      beforedrop: {
        fn: function(node, data, overModel, dropPos, opts) {
          var dropPid = overModel.get('pid');
          var resourcePids = getSelected();
          var conceptPids = getTreeSelected();
          var trueDraggedPid = data.records[0].data.pid;
          //if the trueDraggedPid is in the resourcePids, then it's a resource to tree drag, otherwise it's a tree to tree drag
          var dragPids = resourcePids;
          var parentPids = ContentModelViewer.properties.pids.concept;
          var draggedTypeName = "resource(s)";
          var additionalMessage = "";
          if (resourcePids.indexOf(trueDraggedPid) == -1){
             dragPids = conceptPids;
             draggedTypeName = "concept(s)";
             parentPids = getTreeSelectedParents();
             //Check to see if the concept is dragged to its current parent
             var selectedThatHaveParentAsDropTarget = getTreeSelected(true,null,dropPid);
             if (selectedThatHaveParentAsDropTarget.length > 0){
               var conceptNamesList = "";
               for(var sthpdti = 0; sthpdti < selectedThatHaveParentAsDropTarget.length; sthpdti++){
                  if (sthpdti != 0) conceptNamesList += ", ";
                  conceptNamesList += Ext.getCmp('cmvtreepanel').getNodesByPid(selectedThatHaveParentAsDropTarget[sthpdti])[0].get('text');
               } 
               /*
               Ext.Msg.alert(
                 'Dragged to current parent',
                 'The following concepts:' + conceptNamesList + ' already have ' + Ext.getCmp('cmvtreepanel').getNodesByPid(dropPid)[0].get('text') + ' as a parent and do not need to be associated again'
               );
               */
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
          if (window.modifierKeysHeld.shift){
            Ext.Msg.show({
              title:'Copy '+draggedTypeName,
              msg: additionalMessage + 'Are you sure you want to associate (copy) the selected '+draggedTypeName+' (' + dragPids  + ') to ' + dropLabel + '(' +  dropPid + ')',
              buttons: Ext.Msg.YESNO,
              fn: function(choice) {
                if (choice == 'yes'){
                  jQuery.ajax({
                        url: Drupal.settings.basePath+"viewer/"+dropPid+"/associate/"+dragPids,
                        success: function(responseText){
                          response = JSON.parse(responseText);
                          if (!response.success){
                            Ext.Msg.alert('Status','Problem removing resources:'+response);
                          }else{
                            //Ext.Msg.alert('Status',"Success Response?"+response);
                            ContentModelViewer.functions.selectConcept();
                            ContentModelViewer.functions.refreshTreeParents(ContentModelViewer.properties.pids.concept);
                          }
                        },error: function(errorStuff){
                          Ext.Msg.alert("Got a HTTP error, maybe the ID was incorrect?");
                        }
                  });
                }
              }
            });
          }else{
            Ext.Msg.show({
              title:'Move '+draggedTypeName,
              msg: additionalMessage + 'Are you sure you want to move the selected '+draggedTypeName+' (' + dragPids  + ') to ' + dropLabel + '(' +  dropPid + ')',
              buttons: Ext.Msg.YESNO,
              fn: function(choice) {
                if (choice == 'yes'){
                  jQuery.ajax({
                        url: Drupal.settings.basePath+"viewer/source/"+parentPids+"/dest/"+dropPid+"/move/"+dragPids,
                        success: function(responseText){
                          response = JSON.parse(responseText);
                          if (!response.success){
                            Ext.Msg.alert('Status','Problem removing resources:'+response);
                          }else{
                            //Ext.Msg.alert('Status',"Success Response?"+response);
                            ContentModelViewer.functions.selectConcept();
                            ContentModelViewer.functions.refreshTreeParents(ContentModelViewer.properties.pids.concept);
                          }
                        },error: function(errorStuff){
                          Ext.Msg.alert("Got a HTTP error, maybe the ID was incorrect?");
                        }
                  });

                }
              }
            });
          }
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
      this.store.load({ url: ContentModelViewer.properties.url.object.treemembers(pid) });
    }
  },
  refreshChildren: function (pid) {
    if (pid !== undefined) {
      if (pid === ContentModelViewer.properties.root) {
        this.loadPid(pid);
      } else {
        this.store.load({
          url: ContentModelViewer.properties.url.object.treemembers(pid)
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
    itemmouseup: {
      fn: function (view, record, item, index, event) {
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
                pid = 'si:root';
              }
            }
            ContentModelViewer.functions.selectConcept(pid);
          }
        }
      }
    },
    itemmousedown: {
      fn: function (view, record, item, index, event) {
        jQuery(item).attr("parentpid",record.parentNode.get('pid'));
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
        }
          var pid = record.get('pid');
          if (record.data.id === 'root') {
            if (ContentModelViewer.properties.siUser) {
              pid = ContentModelViewer.properties.siUser;
            } else {
              pid = 'si:root';
            }
          }
          ContentModelViewer.functions.selectConcept(pid);
      }
    },
  }
});

/*
The first item returned in the array is the pid of the selected node that is shown in the right panel
*/
function getTreeSelectedParents(returnAsArray, excludePid){
  var toReturn = [];
  var trueSelectedParentPid = Ext.getCmp('cmvtreepanel').view.getSelectedNodes()[0].getAttribute("parentpid");
  if (trueSelectedParentPid != excludePid) toReturn.push(trueSelectedParentPid);
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
function getTreeSelected(returnAsArray, excludeWithParentPid, onlyIncludeWithParentPid){
  var toReturn = [];
  var trueSelectedPid = Ext.getCmp('cmvtreepanel').view.getSelectedNodes()[0].getAttribute("pid");
  var trueSelectedParentPid = Ext.getCmp('cmvtreepanel').view.getSelectedNodes()[0].getAttribute("parentpid");
  if (trueSelectedParentPid == excludeWithParentPid){
    //Don't include it, specifically excluded
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
