Ext.define('ContentModelViewer.widgets.TreePanel', {
  extend: 'Ext.tree.Panel',
  constructor: function (config) {
    this.callParent(arguments);
  },
  id: 'cmvtreepanel',
  viewConfig : {selectedItemCls : "even"},
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
    itemclick: {
      fn: function (view, record, item, index, event) {
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
});
