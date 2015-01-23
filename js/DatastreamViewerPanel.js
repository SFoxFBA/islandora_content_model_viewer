Ext.onReady(function () {
  Ext.define('ContentModelViewer.widgets.DatastreamViewerPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.datastreamviewerpanel',
    autoScroll: true,
    constructor: function (config) {
      this.callParent(arguments);
      this.load(config.pid, config.dsid, config.viewFunction);
    },
    id: 'datastream-viewer', // Should never overwrite, we should only create this panel once in the viewer.
    itemId: 'datastream-viewer',
    loader: {
      url: 'undefined',
      renderer: 'html',
      successful: 'alert',
      loadMask: true
    },
    load: function (pid, dsid, viewFunction) {
      var properties = ContentModelViewer.properties,
        loader = this.getLoader();
      loader.load({
        url: properties.url.datastream.view(pid, dsid),
        success: function () {
          if (viewFunction) {
            eval(viewFunction)(pid, dsid);
          }
        }
      });
    },
    view: function (pid, dsid, viewFunction) {
      console.log("DatastreamViewerPanel view");
      if (window.bm){
        jQuery("button:contains('Data Components')").click();        
        return; //Temporarily disable the viewer during the batch metadata (so images don't show up at beginning)
      }
      var viewerPanel = this.findParentByType('viewerpanel');
      this.load(pid, dsid, viewFunction);
      Ext.getCmp('cmvtabpanel').setActiveTab(viewerPanel);
    }
  });
});
