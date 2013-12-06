Ext.require('Ext.state.CookieProvider');
Ext.require('Ext.container.Viewport');
Ext.require('Ext.layout.container.Border');
Ext.require('Ext.tab.Panel');
Ext.onReady(function () {
  // Init system
  ContentModelViewer.setup.initContentArea();
  ContentModelViewer.setup.initExtJSFeatures();

  // Create container for Application
  ContentModelViewer.container =  Ext.create('Ext.container.Viewport', {
    renderTo: 'content-model-viewer',
    height: 832,
    width: 920,
    frame: true,
    defaults: {
      split: true
    },
    layout: {
      type: 'border'
    },
    items: [Ext.create('ContentModelViewer.widgets.TreePanel'), {
      xtype: 'tabpanel',
      region: 'center',
      id: 'cmvtabpanel',
      width: 760,
      height: 832,
      listeners: {
        afterrender: function () {
          var token = window.location.hash.substr(1);
          if (token && this.isVisible(token)) {
            this.setActiveTab(token);
          }
          ContentModelViewer.setup.navigateToObject();
        }
      }
    }]
  });
  ContentModelViewer.setup.setUpGlobalEvents();
});
