"use strict";
Ext.ns('ContentModelViewer');
Ext.ns('ContentModelViewer.setup');
Ext.ns('ContentModelViewer.properties');
Ext.ns('ContentModelViewer.functions');
Ext.ns('ContentModelViewer.models');
Ext.ns('ContentModelViewer.widgets');

/**
 * Removes islandora generated HTML and replaces it with the required Content Model viewer HTML.
 */
ContentModelViewer.setup.initContentArea = function () {
  var parent = $('#tabs-tabset').parent();
  if (parent.length) {
    parent.empty();
    parent.append($('#content-model-viewer').remove());
  }
};
/**
 * Initialize ExtJS features.
 */
ContentModelViewer.setup.initExtJSFeatures = function () {
  var expirationDateTime = new Date().getTime() + (1000 * 60 * 60 * 24 * 7); // 7 days from now
  Ext.state.Manager.setProvider(Ext.create('Ext.state.CookieProvider', {
    expires: new Date(expirationDateTime)
  }));
  Ext.QuickTips.init();
};
/**
 * Set up events on global objects such as the window or document.
 */
ContentModelViewer.setup.setUpGlobalEvents = function () {
  if (Object.prototype.hasOwnProperty.call(window, 'onhashchange')) {
    window.onhashchange = function () {
      var token = window.location.hash.substr(1),
        tabpanel = Ext.getCmp('cmvtabpanel');
      if (token && tabpanel.isVisible(token)) {
        tabpanel.setActiveTab(token);
      }
    };
  }
};
/**
 * Set up events on global objects such as the window or document.
 */
ContentModelViewer.setup.navigateToObject = function () {
  var functions = ContentModelViewer.functions,
    properties = ContentModelViewer.properties;
  if (properties.pid !== "") {
    if (properties.isCollection) {
      functions.selectConcept(properties.pid);
    } else {
      functions.selectResource(properties.pid);
    }
  }
};

/**
 * Set up the properties for the Content Model Viewer
 */
ContentModelViewer.setup.initProperties = function () {
  // Local Variables
  var url_replace_pid_func, url_replace_pid_dsid_func, properties;
  properties = ContentModelViewer.properties;
  /**
   * Create a function for generating a url from a store url and a pid.
   */
  url_replace_pid_func = function (id) {
    var url = $(id).text();
    return function (pid) {
      var temp = url;
      return temp.replace('/pid/', '/' + pid + '/');
    };
  };
  /**
   * Create a function for generating a url from a store url and a pid/dsid.
   */
  url_replace_pid_dsid_func = function (id) {
    var url = $(id).text();
    return function (pid, dsid) {
      var temp = url;
      temp = temp.replace('/pid', '/' + pid);
      return temp.replace('/dsid', '/' + dsid);
    };
  };
  // Set properties @todo get collection/focused from URL # if possible.
  properties.rootowner = $('#rootowner').text();
  properties.siUser = $('#si_user').text();
  properties.root = $('#root').text();
  properties.pid = $('#pid').text();
  properties.pids = {
    collection: undefined,
    concept: undefined,
    resource: undefined,
    focused: undefined
  };
  properties.dsid = $('#dsid').text();
  properties.viewFunction = $('#view_function').text();
  properties.isCollection = ($('#is_collection').text() === 'true') ? true : false;
  properties.url = { // Functions to generate AJAX Callback URL
    object: {
      overview: url_replace_pid_func('#object_overview_url'),
      properties: url_replace_pid_func('#object_properties_url'),
      datastreams: url_replace_pid_func('#object_datastreams_url'),
      permission_form: url_replace_pid_func('#object_permission_form_url'),
      metadata_form: url_replace_pid_func('#object_metadata_form_url'),
      publish_form: url_replace_pid_func('#object_publish_form_url'), //SFOX DTC-148
      manage_form: url_replace_pid_func('#object_manage_form_url'),
      delete_form: url_replace_pid_func('#object_delete_form_url'),
      members: url_replace_pid_func('#object_members_url'),
      treemembers: url_replace_pid_func('#object_treemembers_url'),
      treemember: url_replace_pid_func('#object_treemember_url'),
      remove_relationship: url_replace_pid_dsid_func('#object_remove_relationship_url'),
      add: url_replace_pid_dsid_func('#object_add_url'),
      purge: url_replace_pid_func('#object_purge_url')
    },
    datastream: {
      add: url_replace_pid_func('#datastream_add_url'),
      purge: url_replace_pid_dsid_func('#datastream_purge_url'),
      properties: url_replace_pid_dsid_func('#datastream_properties_url'),
      download: url_replace_pid_dsid_func('#datastream_download_url'),
      view: url_replace_pid_dsid_func('#datastream_view_url')
    }
  };
};
/**
 * Defines functions to be used by the Content Model Viewer.
 */
ContentModelViewer.setup.defineFunctions = function() {
    var properties, url;
    properties = ContentModelViewer.properties;
    url = properties.url;
    ContentModelViewer.functions = {
        /**
         * Download Datastream using hidden html form that is rendered with the Viewer.tpl.php
         */
        downloadDatastream: function(pid, dsid) {
            var form = Ext.get("datastream-download-form");
            form.set({
                action: url.datastream.download(pid, dsid)
            });
            document.forms["datastream-download-form"].submit();
        },
        // Shows a Collection, triggered by selecting a parent in the concept/resource overview, or by selecting a item in the treepanel. Can't hide a collection.
        selectConcept: function(pid, closeResourceTab) {
            closeResourceTab = (typeof closeResourceTab === 'undefined') ? true : closeResourceTab;
            properties.pids.concept = pid || properties.pids.concept;
            if (closeResourceTab) { // Don't need to hide the resource if the concept was selected from the resource overview panel
                this.closeResource();
            }
            var cp = Ext.getCmp('collectionpanel');
            if (Ext.getCmp('collectionpanel')) {
                var toReset = Ext.getCmp('collectionpanel').getComponent('collectiondataview').store;
                toReset.currentPage = 1;
                toReset.start = 0;
            }
            pid = properties.pids.concept;
            this.loadConcept(pid);
            //DTC-157 SFOX hide resource tab for non datasets
            var pidsearch;
            pidsearch = pid.search("dtcds:");
            if (pidsearch == -1) {
                var tabpanel, overview;
                tabpanel = Ext.getCmp('cmvtabpanel');
                overview = tabpanel.getComponent('collection');
                if (typeof overview != "undefined") {
                    overview.close();
                }
            } else {
                this.loadResources(pid);
            }//DTC-157 SFOX 

            //SFOX DTC-161 this.loadViewer(pid);
            this.loadManage(pid);
            this.showConcept();
        },
        // The user has selected a resource.
        selectResource: function(pid) {
            properties.pids.resource = pid;
            this.loadResource();
            //SFOX this.loadViewer(pid);
            this.loadManage(pid);
            this.showResource();
            // TODO handle the auto focus of viewer if possible or resource overview if not.
        },
        // Shows the concept in its overview panel, creates the panel if it doesn't already exist. If no pid is give it just refreshes
        loadConcept: function(pid) {
            var tabpanel, overview;
            tabpanel = Ext.getCmp('cmvtabpanel');
            overview = tabpanel.getComponent('concept-overview');
            pid = pid || properties.pids.concept;
            // Create the panel and insert it in the first position if it doesn't exist.
            if (!overview && typeof ContentModelViewer.widgets.OverviewPanel !== 'undefined') {
                tabpanel.insert(0, Ext.create('ContentModelViewer.widgets.OverviewPanel', {
                    title: 'Overview', //SFOX altered this to remove the word concept
                    itemId: 'concept-overview',
                    pid: pid
                }));
            } else if (overview) {
                overview.setPid(pid);
            }
        },
        // Shows a Resource, has no effect on the Current Collection, Focus Viewer and Manage panels on the Resource. If pid is null display the add form.
        loadResource: function(prop) {
            var tabpanel, overview;
            tabpanel = Ext.getCmp('cmvtabpanel');
            overview = tabpanel.getComponent('resource-overview');
            prop = prop || {
                pid: properties.pids.resource
            };
            prop.pid = prop.pid !== undefined ? prop.pid : properties.pids.resource;
            // Create the panel and insert it in the first position if it doesn't exist.
            if (!overview && typeof ContentModelViewer.widgets.OverviewPanel !== 'undefined') {
                tabpanel.insert(2, Ext.create('ContentModelViewer.widgets.OverviewPanel', {
                    title: 'Data Component',
                    itemId: 'resource-overview',
                    pid: prop.pid,
                    url: prop.url
                }));
            } else if (overview) {
                overview.setPid(prop.pid);
            }
        },
        // Hides the Resource Panel changes the focus of the
        closeResource: function() {
            var tabpanel, overview;
            tabpanel = Ext.getCmp('cmvtabpanel');
            overview = tabpanel.getComponent('resource-overview');
            properties.pids.resource = undefined;
            if (overview) {
                overview.close();
            }
        },
        // Display the collection panel with all of the given concepts resources.
        loadResources: function(pid) {
            var resources = Ext.getCmp('collectionpanel');
            pid = pid || properties.pids.concept;
            // Create the panel and insert it in the after the Concept Overview if it doesn't exist.
            if (!resources && typeof ContentModelViewer.widgets.CollectionPanel !== 'undefined') {
                Ext.getCmp('cmvtabpanel').insert(1, Ext.create('ContentModelViewer.widgets.CollectionPanel', {
                    pid: pid
                }));
            } else if (resources) {
                resources.setPid(pid); // The Collection panel should show the resources of the given concept.
            }
        },
        // Display the viewer
        loadViewer: function(pid) {
            var panel, dsid, viewFunction;
            panel = Ext.getCmp('viewerpanel');
            // @TODO get the rest of the params
            // Create the panel and insert it in the first position if it doesn't exist.
            if (!panel && typeof ContentModelViewer.widgets.ViewerPanel !== 'undefined') {
                Ext.getCmp('cmvtabpanel').add(Ext.create('ContentModelViewer.widgets.ViewerPanel', {
                    pid: pid,
                    dsid: dsid,
                    viewFunction: viewFunction
                }));
            } else if (panel) {
                panel.setPid(pid);
            }
        },
        loadManage: function(pid) {
            var panel = Ext.getCmp('managepanel');
            // Create the panel and insert it in the last position if it doesn't exist.
            if (!panel && typeof ContentModelViewer.widgets.ManagePanel !== 'undefined') {
                Ext.getCmp('cmvtabpanel').add(Ext.create('ContentModelViewer.widgets.ManagePanel', {
                    pid: pid
                }));
            } else if (panel) {
                panel.setPid(pid);
            }
        },
        loadAddResourceForm: function() {
            var cmv, overview, url, form_selector, success, data;
            cmv = this;
            overview = Ext.getCmp('cmvtabpanel').getComponent('resource-overview');
            url = ContentModelViewer.properties.url.object.add(ContentModelViewer.properties.pids.concept, 'resource');
            form_selector = '#add-resource-form form';
            success = function(loader, response, options) {
                if (typeof response.responseText !== 'undefined') {
                    data = JSON.parse(response.responseText);
                    if (data.refresh) {
                        cmv.refreshTreeNodes(ContentModelViewer.properties.pids.concept); // Update the number in the tree
                        cmv.selectResource(data.refresh); // Should be newly created object.
                        cmv.refreshResources(); // Show object in page if possible.
                    }
                }
            };
            if (!overview) {
                this.loadResource({
                    url: url
                });
            } else {
                overview.loadAddObjectContent(url, form_selector, success);
            }
            this.showResource();
        },
        loadAddConceptForm: function() {
            var cmv, data, url;
            url = ContentModelViewer.properties.url.object.add(ContentModelViewer.properties.pids.concept, 'concept');
            cmv = this;
            Ext.getCmp('cmvtabpanel').getComponent('concept-overview').loadAddObjectContent(url, '#add-concept-form form', function(loader, response, options) {
                if (typeof response.responseText !== 'undefined') {
                    data = JSON.parse(response.responseText);
                    if (data.refresh) {
                        cmv.refreshTreeNodes(ContentModelViewer.properties.pids.concept); // Update the object we were previously on
                        cmv.selectConcept(data.refresh); // Should be newly created object.
                    }
                }
            });
        },
        loadResourceEditMetadataForm: function() {
            var cmv, data;
            cmv = this;
            Ext.getCmp('cmvtabpanel').getComponent('resource-overview').loadEditMetadataContent('#resource-metadata-form form', function(loader, response, options) {
                if (typeof response.responseText !== 'undefined') {
                    data = JSON.parse(response.responseText);
                    if (data.refresh) {
                        cmv.refreshResource();
                        cmv.refreshResources();
                        cmv.refreshTreeNodes(ContentModelViewer.properties.pids.concept); // Update the object we were previously on
                    }
                }
            });
        },
        loadConceptEditMetadataForm: function() {
            var cmv, data;
            cmv = this;
            Ext.getCmp('cmvtabpanel').getComponent('concept-overview').loadEditMetadataContent('#concept-metadata-form form', function(loader, response, options) {
                if (typeof response.responseText !== 'undefined') {
                    data = JSON.parse(response.responseText);
                    if (data.refresh) {
                        cmv.refreshTreeNodes(data.refresh);
                    }
                }
            });
        },
        //SFOX DTC-148
        loadPublishDatasetForm: function() {
            var cmv, data;
            cmv = this;
            Ext.getCmp('cmvtabpanel').getComponent('concept-overview').loadPublishMetadataContent('#dataset-publish-form form', function(loader, response, options) {
                if (typeof response.responseText !== 'undefined') {
                    data = JSON.parse(response.responseText);
                    if (data.refresh) {
                        cmv.refreshTreeNodes(data.refresh);
                    }
                }
            });
        },
        //
        loadDatacompManageForm: function() {
            var cmv, data;
            cmv = this;
            Ext.getCmp('cmvtabpanel').getComponent('resource-overview').loadManageFilesContent('#datacomp-manage-form form', function(loader, response, options) {
                if (typeof response.responseText !== 'undefined') {
                    data = JSON.parse(response.responseText);
                    if (data.refresh) {
                        cmv.refreshResource();
                        cmv.refreshResources();
                        cmv.refreshTreeNodes(ContentModelViewer.properties.pids.concept); // Update the object we were previously on
                    }
                }
            });
        },
        loadDatacompDeleteForm: function() {
            var cmv, data;
            cmv = this;
            Ext.getCmp('cmvtabpanel').getComponent('resource-overview').loadDeleteFilesContent('#datacomp-delete-form form', function(loader, response, options) {
                if (typeof response.responseText !== 'undefined') {
                    data = JSON.parse(response.responseText);
                    if (data.refresh) {
                        cmv.refreshResource();
                        cmv.refreshResources();
                        cmv.refreshTreeNodes(ContentModelViewer.properties.pids.concept); // Update the object we were previously on
                    }
                }
            });
        },
        loadResourceEditPermissionForm: function() {
            Ext.getCmp('cmvtabpanel').getComponent('resource-overview').loadEditPermissionContent('#resource-permission-form form');
        },
        //
        loadConceptEditPermissionForm: function() {
            Ext.getCmp('cmvtabpanel').getComponent('concept-overview').loadEditPermissionContent('#concept-permission-form form');
        },
        //
        refreshConcept: function() {
            var panel = Ext.getCmp('cmvtabpanel').getComponent('concept-overview');
            if (panel) {
                panel.refresh();
            }
        },
        //
        refreshResource: function() {
            var panel = Ext.getCmp('cmvtabpanel').getComponent('resource-overview');
            if (panel) {
                if (properties.pids.resource !== undefined) {
                    panel.refresh();
                } else {
                    this.closeResource();
                    this.showConcept();
                }
            }
        },
        //
        refreshResources: function() {
            Ext.getCmp('collectionpanel').refresh();
        },
        refreshTreeNodes: function(pid) {
            Ext.getCmp('cmvtreepanel').refreshNodes(pid);
        },
        // Reloads the tree data.
        refreshTree: function(pid) {
            Ext.getCmp('cmvtreepanel').refreshChildren(pid);
        },
        refreshTreeParents: function(pid) {
            Ext.getCmp('cmvtreepanel').refreshParents(pid);
        },
        //
        showConcept: function() {
            var tabpanel, panel;
            tabpanel = Ext.getCmp('cmvtabpanel');
            panel = tabpanel.getComponent('concept-overview');
            if (panel) {
                Ext.getCmp('cmvtabpanel').setActiveTab(panel);
            }
        },
        //
        showResource: function() {
            var tabpanel, panel;
            tabpanel = Ext.getCmp('cmvtabpanel');
            panel = tabpanel.getComponent('resource-overview');
            if (panel) {
                tabpanel.setActiveTab(panel);
            }
        },
        //
        showViewer: function() {
            console.log("showViewer");
            var panel = Ext.getCmp('viewerpanel');
            if (panel) {
                Ext.getCmp('cmvtabpanel').setActiveTab(panel);
                // TODO set the default view datastream? or do so in the load function?
            }
        },
        // Olderstuff
        // This pid determines whats shown in the tree and if the ConceptOverview is shown
        setCollectionPid: function(pid) {
            var collection = Ext.getCmp('collectionpanel');
            properties.pids.collection = pid;
            collection.setPid(pid);
        },
        // Determines whats shown in viewer/manage
        setFocusedPid: function(pid, isCollection) {
            var viewer = Ext.getCmp('viewerpanel'),
                    manage = Ext.getCmp('managepanel'),
                    tabpanel = Ext.getCmp('cmvtabpanel'),
                    resourceOverview = tabpanel.getComponent('resource-overview'),
                    index;

      properties.pids.focused = pid;
      if (!isCollection) {
        if (!resourceOverview) { // Create
          index = properties.isCollection ? 2 : 1;
          tabpanel.insert(index, Ext.create('ContentModelViewer.widgets.OverviewPanel', {
                        title: 'Data Components',
            itemId: 'resource-overview',
            pid: pid
          }));
          resourceOverview = tabpanel.getComponent('resource-overview');// pp added this
        } else {
          resourceOverview.setPid(pid);
        }
      }
      tabpanel.setActiveTab(resourceOverview);//pp added this
      viewer.setPid(pid);
      manage.setPid(pid);
    },
    isPidFocused: function (pid) {
      return properties.pids.focused === pid;
    },
    selectDatastreamRecord: function (record) {
      properties.dsid = record.get('view');
      properties.viewFunction = record.get('view_function');
    },
    viewSelectedDatastreamRecord: function () {
      var viewer, loader;
      viewer = Ext.getCmp('datastream-viewer');
      loader = viewer.getLoader();
      loader.load({
        url: url.datastream.view(properties.pid, properties.dsid)
      });
      viewer.up('tabpanel').setActiveTab(viewer.up('panel'));
    },
    callDatastreamViewFunction: function () {
      if (properties.view_function) {
        eval(properties.view_function)(properties.pid, properties.dsid);
      }
    }
  };
};
/**
 * Defines models that repersent Fedora objects/data streams.
 */
ContentModelViewer.setup.defineModels = function () {
  // Local Variables
  var url = ContentModelViewer.properties.url,
    pid = ContentModelViewer.properties.pid,
    root = ContentModelViewer.properties.root,
    dsid = ContentModelViewer.properties.dsid;
  Ext.define('ContentModelViewer.models.FedoraObject', {
    extend: 'Ext.data.Model',
    fields: [{
      name: 'pid',
      type: 'string'
    }, {
      name: 'link',
      type: 'string'
    }, {
      name: 'label',
      type: 'string'
    }, {
      name: 'description',
      type: 'string'
    }, {
      name: 'owner',
      type: 'string'
    }, {
      name: 'created',
      type: 'string'
    }, {
      name: 'modified',
      type: 'string'
    }, {
      name: 'tn',
      type: 'string'
    }, {
      name: 'isCollection',
      type: 'boolean'
    }, {
      name: 'originalMetadata',
      type: 'boolean',
      defaultValue: false
    }]
  });
  Ext.define('ContentModelViewer.models.treemembers', {
    extend: 'Ext.data.Model',
    fields: ['id', 'text', 'link', 'pid', 'leaf', 'children'],
    proxy: {
      type: 'ajax',
      url : url.object.treemembers(root),
      reader: {
        type: 'json',
        root: 'data'
      }
    }
  });
  Ext.define('ContentModelViewer.models.ObjectProperties', {
    extend: 'Ext.data.Model',
    fields: [{
      name: 'label',
      type: 'string'
    }, {
      name: 'state',
      type: 'string'
    }, {
      name: 'owner',
      type: 'string'
    }, {
      name: 'created',
      type: 'string'
    }, {
      name: 'modified',
      type: 'string'
    }],
    validations: [{
      type: 'inclusion',
      field: 'state',
      list: ['Active', 'Inactive', 'Deleted']
    }]
  });
  Ext.define('ContentModelViewer.models.Datastream', {
    extend: 'Ext.data.Model',
    idProperty: 'dsid',
    fields: [{
      name: 'dsid',
      type: 'string'
    }, {
      name: 'olabel',
      type: 'string'
    }, {
      name: 'state',
      type: 'string'
    }, {
      name: 'created',
      type: 'string'
    }, {
      name: 'mime',
      type: 'string'
    }, {
      name: 'view',
      type: 'string'
    }, {
      name: 'download',
      type: 'string'
    }, {
      name: 'tn',
      type: 'string'
    }, {
      name: 'view_function',
      type: 'string'
    }, {
      name: 'edit',
      type: 'bool'
    }, {
      name: 'default',
      type: 'bool'
    }],
    validations: [{
      type: 'inclusion',
      field: 'state',
      list: ['A', 'I']
    }],
    proxy: {
      type: 'rest',
      url : url.object.datastreams(pid, dsid),
      reader: {
        type: 'json',
        root: 'data',
        totalProperty: 'total'
      }
    }
  });
};

/**
 * Create stores.
 */
ContentModelViewer.setup.createStores = function () {
  var models = ContentModelViewer.models,
    url = ContentModelViewer.properties.url,
    pid = ContentModelViewer.properties.pid,
    dsid = ContentModelViewer.properties.dsid,
    icon = 'folder',
    rootowner = 'Root';

  /**
   * Tree Store
   */
  if (ContentModelViewer.properties.root === ContentModelViewer.properties.siUser) {
    icon = 'peopleCModel';
    rootowner = ContentModelViewer.properties.rootowner;
  }
  Ext.create('Ext.data.TreeStore', {
    storeId: 'treemembers',
    folderSort: false,
    model: models.treemembers,
    sorters: [{
      property: 'text',
      direction: 'ASC'
    }],
    root: {
      text: rootowner,
      iconCls: icon,
      expanded: true,
      pid: ContentModelViewer.properties.root
    }
  });
};

Ext.require('Ext.data.TreeStore');
Ext.onReady(function () {
  // Local Variables
  var setup = ContentModelViewer.setup;
  setup.initProperties();
  setup.defineFunctions();
  setup.defineModels();
  setup.createStores();
});

//For when cancel is pressed, what to do: reload the page, basically
window.clickWait = 10;
window.properResetUiForCancel = function(thenClickButtonThatSays){
  var selMod = Ext.getCmp('cmvtreepanel').getSelectionModel();
  if (selMod){
    if (selMod.getSelection().length > 0){
      selMod.select(selMod.getSelection());
      var pid = selMod.getSelection()[0].get("pid");
      jQuery('tr[pid="'+pid+'"]').addClass("sidoraTreeMultiSelect");
      ContentModelViewer.functions.selectConcept(pid);
    }
  }
  if (thenClickButtonThatSays){
    setTimeout(function(){
      jQuery("button:contains('"+thenClickButtonThatSays+"')").click();
    },window.clickWait);
  }
};


/**
 * Add in prototypes which weren't on Beth's browser, Chrome v32????  Should've been there. Reason missing unknown.
 */
if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function(prefix) {
        return this.slice(0, prefix.length) == prefix;
    };
}
 
if (typeof String.prototype.endsWith != 'function') {
    String.prototype.endsWith = function(suffix) {
        return this.slice(-suffix.length) == suffix;
    };
}
if (typeof String.prototype.contains != 'function') {
  String.prototype.contains = function(it) { return this.indexOf(it) != -1; };
}

