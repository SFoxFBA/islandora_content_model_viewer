Ext.onReady(function () {
  Ext.define('ContentModelViewer.widgets.ViewerPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.viewerpanel',
    config: {
      pid: 'required',
      dsid: 'optional',
      viewFunction: 'optional'
    },
    constructor: function (config) {
      this.callParent(arguments);
      this.add(Ext.create('ContentModelViewer.widgets.DatastreamViewerPanel', {
        region: 'center',
        pid: config.pid,
        dsid: config.dsid,
        viewFunction: config.viewFunction
      }));
      //DTC-199
      //this.add(Ext.create('ContentModelViewer.widgets.FilesPanel', {
      //  region: 'east',
      //  pid: config.pid,
      // onLoad: this.onLoad
      //}));
    },
    title: 'Viewer',
    id: 'viewerpanel',
    itemId: 'viewer',
    layout: {
      type: 'border'
    },
    setPid: function (pid) {
      this.pid = pid;
      //DTC-199 var files = this.getComponent('files');
      //DTC-199 files.setPid(pid);
    },
    onLoad: function (store, records, successful, operation, eOpts) {
      var record, pid, dsid, viewFunction, i;
      if (record) { //SFOX added this line
      for (i = 0; i < records.length; i += 1) {
        record = records[i];
        if (record.get('default')) {
          pid = Ext.getCmp('viewerpanel').pid;
          dsid = record.get('dsid');
          viewFunction = record.get('view_function');
          Ext.getCmp('datastream-viewer').view(pid, dsid, viewFunction);
          return;
        }
      }
    }
    Ext.getCmp('datastream-viewer').update('No Viewer Available');
    }
  });
});
