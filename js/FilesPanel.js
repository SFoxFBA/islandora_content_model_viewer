Ext.onReady(function () {
  Ext.define('ContentModelViewer.widgets.FilesPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.filespanel',
    config: {
      pid: 'required'
    },
    constructor: function (config) {
      var store, datastreams, toolbar, pager;
      this.callParent(arguments);
      this.collapsed = true;
      store = this.store = Ext.create('Ext.data.Store', {
        model: ContentModelViewer.models.Datastream,
        autoLoad: true,
        pageSize: 4,
        proxy: {
          type: 'rest',
          url : ContentModelViewer.properties.url.object.datastreams(config.pid),
          extraParams: {
            filter: true
          },
          reader: {
            type: 'json',
            root: 'data',
            totalProperty: 'total'
          }
        },
        listeners: {
          load: config.onLoad || function () {}
        }
      });
      datastreams = Ext.create('Ext.view.View', {
        itemId: 'datastreams',
        itemSelector: 'div.file-item',
        emptyText: 'No Files Available',
        deferEmptyText: false,
        itemTpl: new Ext.XTemplate(
          '<tpl for=".">',
          '   <div class="file-item">',
          '       <div class="file-item-dsid">{[fm.ellipsis(values.dsid, 30, true)]}</div>',
          '       <img class="file-item-img file-item-show-view" src="{tn}"></img>',
          '       <tpl if="this.showLabel(label)">',
          '           <div class="file-item-label">{[fm.ellipsis(values.label, 30, true)]}</div>',
          '       </tpl>',
          '   </div>',
          '</tpl>',
          {
            compiled: true,
            disableFormats: true,
            showLabel: function (label) {
              return jQuery.trim(label) !== '';
            }
          }
        ),
        store: store,
        listeners: {
          selectionchange: function (view, selections, options) {
            var toolbar, record;
            toolbar = this.findParentByType('filespanel').getComponent('toolbar');
            record = selections[0];
            if (record) {
              if (record.get('view')) {
                toolbar.getComponent('view').enable();
              } else {
                toolbar.getComponent('view').disable();
              }
              if (record.get('download')) {
                toolbar.getComponent('download').enable();
              } else {
                toolbar.getComponent('download').disable();
              }
            }
          }
        }
      });
      toolbar = Ext.create('Ext.toolbar.Toolbar', {
        dock: 'top',
        itemId: 'toolbar',
        items: [{
          xtype: 'button',
          text: 'View',
          itemId: 'view',
          cls: 'x-btn-text-icon',
          iconCls: 'view-datastream-icon',
          disabled: true,
          handler : function () {
            var filesPanel, record, dsid, func;
            filesPanel = this.findParentByType('filespanel');
            record = filesPanel.getSelected();
            if (record) {
              dsid = record.get('view');
              func = record.get('view_function');
              Ext.getCmp('datastream-viewer').view(filesPanel.pid, dsid, func);
            }
          }
        }, {
          xtype: 'button',
          text: 'Download',
          cls: 'x-btn-text-icon',
          iconCls: 'download-datastream-icon',
          itemId: 'download',
          disabled: true,
          handler : function () {
            var filesPanel, record;
            filesPanel = this.findParentByType('filespanel');
            record = filesPanel.getSelected();
            if (record) {
              ContentModelViewer.functions.downloadDatastream(filesPanel.pid, record.get('dsid'));
            }
          }
        }]
      });
      pager = Ext.create('Ext.toolbar.Paging', {
        dock: 'bottom',
        itemId: 'pager',
        xtype: 'pagingtoolbar',
        store: store
      });
      this.add(datastreams);
      this.addDocked(toolbar);
      this.addDocked(pager);
    },
    setPid: function (pid) {
      var pager = this.getComponent('pager');
      this.pid = pid;
      this.store.setProxy({
        type: 'rest',
        url : ContentModelViewer.properties.url.object.datastreams(pid),
        extraParams: {
          filter: true
        },
        reader: {
          type: 'json',
          root: 'data',
          totalProperty: 'total'
        }
      });
      pager.doRefresh();
    },
    getSelected: function () {
      var datastreams, selectionModel;
      datastreams = this.getComponent('datastreams');
      selectionModel = datastreams.getSelectionModel();
      if (selectionModel.hasSelection()) {
        return selectionModel.selected.first();
      }
      return null;
    },
    title: 'Files',
    itemId: 'files',
    width: 260,
    collapsible: true,
    split: true
  });
});
