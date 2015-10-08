Ext.onReady(function () {
    Ext.define('ContentModelViewer.widgets.CollectionDataView', {
        extend: 'Ext.view.View',
        itemId: 'collectiondataview',
        itemSelector: 'div.x-dataview-item',
        emptyText: 'No Files Available',
        deferEmptyText: false,
        deferInitialRefresh: false,
        mixins: {
            //SFOX disable drag n drop for now
            //dragSelector: 'Ext.ux.DataView.DragSelector',
            //draggable: 'Ext.ux.DataView.Draggable'
        },
        itemTpl: new Ext.XTemplate(
                '<tpl for=".">',
        //SFOX Removed the Original Metadata tick/exclamation mark for now
        //        ' <tpl if="originalMetadata">',
                '   <div class="member-item">',
        //        '    <span class="incompleteMeta" title="Metadata incomplete"></span>',
                '    <input class="resourceBatchSelector" type="checkbox" style="display:none;float:left;height:100%" name="{pid}"/>',
                '    <span style="float:left;text-align:center">',
                '     <img class="member-item-img" src="{tn}"></img>',
                '    </span>',
                '    <div class="member-item-label" style="height:16px;">{label}</div>', //SFOX Horrible bodge to fix css error in chrome/IE
                '   </div>',
        //        ' </tpl>',
        //        ' <tpl if="!originalMetadata">',
        //        '   <div class="member-item">',
         //       '    <span class="completeMeta" title="Metadata complete"></span>',
        //        '    <input class="resourceBatchSelector" type="checkbox" style="display:none;float:left;height:100%" name="{pid}"/>',
        //        '    <span style="float:left;text-align:center">',
        //        '     <img class="member-item-img" src="{tn}"></img>',
        //        '    </span>',
        //        '    <div class="member-item-label">{label}</div>',
        //        '   </div>',
        //        ' </tpl>',
                '</tpl>',
                {
                    compiled: true,
                    disableFormats: true,
                    getLabel: function (label) {
                        var empty = (jQuery.trim(label) === '');
                        return empty ? 'Default Label: (Please notify an administrator to provide a label)' : label;
                    },
                    isUnedited: function (originalMetadata) {
                        return originalMetadata;
                    }
                }
        ),
        initComponent: function () {
            var me = this;
            //SFOX disable drag n drop for now
            //this.mixins.dragSelector.init(this);
            //this.mixins.draggable.init(this, {
            //    ddConfig: {
            //        ddGroup: 'cmvDDGroup'
            //    }
            //});
            this.callParent();
        },
        listeners: {
            itemclick: {
                fn: function (view, selections, options, one, two, three) {
                    //if not holding control, get rid of all highlights except whatever mouse is over
                    if (window.modifierKeysHeld.ctrl) {
                        if (jQuery("[name='" + selections.get("pid") + "']").parent().parent().hasClass("x-item-selected")) {
                            jQuery("[name='" + selections.get("pid") + "']").parent().parent().removeClass("x-item-selected");
                        } else {
                            jQuery("[name='" + selections.get("pid") + "']").parent().parent().addClass("x-item-selected");
                        }
                        return;
                    }
                    jQuery(".member-item").parent().each(function (num, a) {
                        $(a).removeClass("x-item-selected");
                    });
                    jQuery("[name='" + selections.get("pid") + "']").parent().parent().addClass("x-item-selected");
                }
            },
            selectionchange: function (view, selections, options) {
                //var record = selections[0];
            },
            beforeselect: function (one, two, three, four) {
                if (window.modifierKeysHeld.ctrl) {
                    return false; //Don't select current one
                } else if (jQuery("[name='" + two.get("pid") + "']").parent().parent().hasClass("x-item-selected")) {
                    return false; //expecting a click-drag when choosing one that is already there, look at mouse-up to undo
                } else {
                    jQuery(".member-item").parent().each(function (num, a) {
                        $(a).removeClass("x-item-selected");
                    }) //was a normal reselecting click, remove existing selected
                }
            },
            itemdblclick: function (view, record) {
                ContentModelViewer.functions.selectResource(record.get('pid'));
            },
            itemmousedown: {
                fn: function (view, record, item, index, event) {
                    jQuery(".x-dd-drop-icon").addClass("sidoraDDIcon");
                }
            },
            itemmouseup: {
                fn: function (view, record, item, index, event) {
                }
            }
        },
        setPid: function (pid) {
            this.pid = pid;
            this.store.setProxy({
                type: 'ajax',
                url: ContentModelViewer.properties.url.object.members(pid),
                reader: {
                    type: 'json',
                    root: 'data'
                }
            });
            this.store.load();
        },
        constructor: function (config) {
            this.callParent(arguments);
            this.bindStore(Ext.create('Ext.data.Store', {
                model: ContentModelViewer.models.FedoraObject,
                autoLoad: true,
                autoSync: true,
                pageSize: 20,
                remoteSort: true,
                remoteFilter: true,
                sorters: [{
                        property: 'label',
                        direction: 'ASC'
                    }],
                filters: [{
                        property: 'label',
                        value: null
                    }],
                proxy: {
                    type: 'ajax',
                    url: ContentModelViewer.properties.url.object.members(config.pid),
                    reader: {
                        type: 'json',
                        root: 'data'
                    }
                }
            }));
        }
    });
    Ext.define('ContentModelViewer.widgets.CollectionPanel', {
        extend: 'Ext.panel.Panel',
        id: 'collectionpanel',
        itemId: 'collection',
        title: 'Data Components',
        constructor: function (config) {
            this.callParent(arguments);
            this.add(Ext.create('ContentModelViewer.widgets.CollectionDataView', {pid: config.pid}));
            var store, sorter;
            store = this.getComponent('collectiondataview').getStore();
            sorter = (function () {
                var types = ['label', 'created'],
                        directions = ['ASC', 'DESC'],
                        labels = ['Label', 'Date Created'],
                        type = 0,
                        direction = 0;
                return {
                    toggleType: function () {
                        type = type ? 0 : 1;
                    },
                    toggleDirection: function () {
                        direction = direction ? 0 : 1;
                    },
                    type: function () {
                        return types[type];
                    },
                    label: function () {
                        return labels[type];
                    },
                    direction: function () {
                        return directions[direction];
                    },
                    refresh: function () {
                        store.sorters.clear();
                        store.sorters.add(new Ext.util.Sorter({
                            property: this.type(),
                            direction: this.direction()
                        }));
                        store.load();
                    }
                };
            }());
            this.addDocked(Ext.create('Ext.toolbar.Toolbar', {
                itemId: 'toolbar',
                dock: 'top',
                items: [{
                        xtype: 'tbtext',
                        text: 'Sort By: '
                    }, Ext.create('Ext.Action', {
                        text: sorter.label(),
                        handler: function (action, event) {
                            sorter.toggleType();
                            action.setText(sorter.label());
                            sorter.refresh();
                        }
                    }), {
                        xtype: 'sortbutton',
                        text: sorter.direction(),
                        listeners: {
                            changeDirection: function (direction) {
                                sorter.toggleDirection();
                                this.setText(sorter.direction());
                                sorter.refresh();
                            }
                        }
                    }, {
                        xtype: 'tbtext',
                        text: 'Search'
                    }, {
                        xtype: 'textfield',
                        hideLabel: true,
                        width: 200
                    }, {
                        xtype: 'button',
                        text: 'Go',
                        handler: function (button, event) {
                            var filters, label, toolbar, search, value;
                            filters = store.filters;
                            label = filters.get(0);
                            toolbar = button.up('toolbar');
                            search = toolbar.down('textfield');
                            value = Ext.String.trim(search.getValue());
                            label.value = (value !== '') ? value : null;
                            store.load();
                        }
                    }, '->', /* SFOX Not needed for now {
                        xtype: 'combobox',
                        store: Ext.create('Ext.data.Store', {
                            model: Ext.regModel('State', {
                                fields: [
                                    {type: 'string', name: 'name'}
                                ]
                            }),
                            data: [
                                {"name": "Delete"},
                                //{"name":"Copy To..."}
                                {"name": "Edit Metadata..."}
                            ]
                        }),
                        displayField: 'name',
                        width: 120,
                        queryMode: 'local',
                        triggerAction: 'all',
                        emptyText: 'Choose action',
                        text: 'Multi-dropdown',
                        disableKeyFilter: true,
                        editable: false,
                        listeners: {
                            'select': function (one, two, three, four) {//(button, event) {
                                if (two[0].data.name == "Delete") {
                                    rbs = jQuery(".x-item-selected .resourceBatchSelector");
                                    var deleteThese = "";
                                    for (rbsi = 0; rbsi < rbs.size(); rbsi++) {
                                        if (deleteThese.length > 0)
                                            deleteThese += ",";
                                        deleteThese += jQuery(rbs[rbsi]).attr("name");
                                    }
                                    //alert("Delete chosen:"+deleteThese);
                                    if (rbs.size() == 0) {
                                    } else {
                                        Ext.Msg.show({
                                            title: 'Delete Resources',
                                            msg: "Are you sure you want to delete " + rbs.size() + " Data Components? This action cannot be undone.",
                                            buttons: Ext.Msg.YESNO,
                                            fn: function (choice) {
                                                if (choice == 'yes') {
                                                    jQuery.ajax({
                                                        url: Drupal.settings.basePath + "viewer/" + ContentModelViewer.properties.pids.concept + "/item_information/" + deleteThese + "/delete",
                                                        success: function (responseText) {
                                                            response = JSON.parse(responseText);
                                                            if (!response.success) {
                                                                Ext.Msg.alert('Status', 'Problem removing resources:' + response);
                                                            } else {
                                                                Ext.Msg.alert('Status', response.purged.length + " Data Component(s) deleted and " + response.unassociated.length + " Data Component(s) un-associated from the current object.");
                                                                ContentModelViewer.functions.selectConcept();
                                                                ContentModelViewer.functions.refreshTreeParents(ContentModelViewer.properties.pids.concept);
                                                                jQuery("button:contains('Data Components')").click();
                                                            }
                                                        }
                                                    });
                                                }
                                            }
                                        });
                                        this.clearValue();
                                    }
                                }
                                if (two[0].data.name == "Edit Metadata...") {
                                    rbs = jQuery(".x-item-selected .resourceBatchSelector");
                                    if (rbs.size() == 0) {
                                        //Error message?
                                    } else {
                                        window.bm = new BatchMetadata();
                                        if (jQuery("button:contains('Data Components')").length == 0) {
                                            ContentModelViewer.functions.selectResource(jQuery(rbs[0]).attr('name'));//"si:257367");  //Fill with proper ID
                                            //Auto-swaps to tab, images then go to viewer...why?
                                        } else {
                                            //Swap to the resource overview tab:
                                            jQuery("button:contains('Data Components')").click();
                                        }
                                        for (rbsi = 0; rbsi < rbs.size(); rbsi++) {
                                            var fedoraId = jQuery(rbs[rbsi]).attr('name');
                                            window.bm.fedoraIds.push(fedoraId);
                                        }
                                        window.bm.displayNext();
                                    }
                                    this.clearValue();
                                }
                                if (two[0].data.name == "Copy To...") {
                                    rbs = jQuery(".x-item-selected .resourceBatchSelector");
                                    var deleteThese = "";
                                    for (rbsi = 0; rbsi < rbs.size(); rbsi++) {
                                        if (deleteThese.length > 0)
                                            deleteThese += ",";
                                        deleteThese += jQuery(rbs[rbsi]).attr("name");
                                    }
                                    //alert("Delete chosen:"+deleteThese);
                                    Ext.Msg.prompt(
                                            'Copy Resources',
                                            "Where do you want to copy " + rbs.size() + " resources? DEV, requires si:####### will be changed to lookup like current 'Link to another Concept'. Currently doesn't make checks against it, will 'double associate' if you do it to the same one twice, and will try to add a resource as a resource of a resource, etc.",
                                            function (choice, text) {
                                                if (choice == 'ok') {
                                                    jQuery.ajax({
                                                        url: Drupal.settings.basePath + "viewer/" + text + "/associate/" + deleteThese,
                                                        success: function (responseText) {
                                                            response = JSON.parse(responseText);
                                                            if (!response.success) {
                                                                Ext.Msg.alert('Status', 'Problem removing resources:' + response);
                                                            } else {
                                                                Ext.Msg.alert('Status', "Success Response?" + response);
                                                                ContentModelViewer.functions.selectConcept();
                                                                ContentModelViewer.functions.refreshTreeParents(ContentModelViewer.properties.pids.concept);
                                                            }
                                                        }, error: function (errorStuff) {
                                                            Ext.Msg.alert("Got a HTTP error, maybe the ID was incorrect?");
                                                        }
                                                    });
                                                }
                                            }
                                    );
                                    this.clearValue();
                                }
                            }
                        }
                    }, */
                    {
                        xtype: 'button',
                        text: 'Add a new Data Component', //SFOX changed this
                        handler: function (button, event) {
                            window.tabularDataCodebookStep = "_ANR";
                            ContentModelViewer.functions.loadAddResourceForm();
                        }
                    }],
                constructor: function (config) {
                    this.callParent(arguments);
                }
            }));

            this.addDocked(Ext.create('Ext.toolbar.Paging', {store: store, dock: 'top', displayInfo: true, itemId: 'top-pager'}));
            this.addDocked(Ext.create('Ext.toolbar.Paging', {store: store, dock: 'bottom', displayInfo: true, itemId: 'bottom-pager'}));
        },
        setPid: function (pid) {
            this.getComponent('collectiondataview').setPid(pid);
        },
        refresh: function () {
            this.getDockedComponent('top-pager').doRefresh();
        }
    });
});
window.wasADeselect = false;
window.wasASelect = false;
function getSelectedWithLabels() {
    rbs = jQuery(".x-item-selected .resourceBatchSelector");
    var selectedPids = "";
    for (rbsi = 0; rbsi < rbs.size(); rbsi++) {
        var currPid = jQuery(rbs[rbsi]).attr("name");
        var currText = jQuery(rbs[rbsi]).parent().children(".member-item-label").text();
        if (selectedPids.indexOf(currPid) == -1) { //don't add twice
            if (selectedPids.length > 0)
                selectedPids += "<br>";
            selectedPids += currPid + " - " + currText;
        }
    }
    return selectedPids;
}
function getSelected() {
    rbs = jQuery(".x-item-selected .resourceBatchSelector");
    var selectedPids = "";
    for (rbsi = 0; rbsi < rbs.size(); rbsi++) {
        var currName = jQuery(rbs[rbsi]).attr("name");
        if (selectedPids.indexOf(currName) == -1) { //don't add twice
            if (selectedPids.length > 0)
                selectedPids += ",";
            selectedPids += currName;
        }
    }
    return selectedPids;
}


function BatchMetadata() {
    this.isRunning = false
    this.fedoraIds = [];
    this.nextIndex = 0;
    this.isStarted = false;
    this.readyToDisplayNext = true;
    this.isDisplayingFinal = false;  //If it's complete, but the final metadata is still showing on the screen
    this.isCompleted = function () {
        return (this.nextIndex >= this.fedoraIds.length);
    }
    this.repurposeEditMetadataScreen = function () {
        if (!this.isRunning && !this.isDisplayingFinal) {
            return; //shouldn't be repurposing if the batch metadata isn't running
        }
        var theBmDriver = this;
        if (jQuery('.form-submit:[value="Cancel"]').length > 0) {  //Confirms we are on edit metadata screen
            var barPreMetadataHtml = '<div id="bmTopButtons" style="margin:4px;"><button class="islandora-repo-button" value="" name="bm_next" type="button" title="Save this metadata and see the next">Next</button><button class="islandora-repo-button" value="" name="bm_cancel" type="button" title="Previous changes are already saved">Stop Updating</button></div>'; //Cancel has meant
            jQuery('#content-model-viewer-edit-metadata-form').prepend(barPreMetadataHtml);
            jQuery("button[name='bm_next']").click(function () {
                theBmDriver.submitMetadata();
            });
            jQuery("button[name='bm_cancel']").click(function () {
                theBmDriver.cancel();
            });
        }
        if (this.isDisplayingFinal) {
            jQuery("button[name='bm_next']").text("Finish");
            jQuery("button[name='bm_next']").attr("title", "Save this metadata and go back to the resources list");
        }
        jQuery('.form-submit:[value="Cancel"]').addClass("x-hide-display");
        jQuery('.form-submit:[value="Submit"]').addClass("x-hide-display");
    }
    this.submitMetadata = function () {
        var resOver = Ext.getCmp('cmvtabpanel').getComponent('resource-overview');
        var theBmDriver = this;
        resOver.loadEditMetadataContent('#resource-metadata-form form', function (loader, response, options) {
            if (!theBmDriver.isCompleted()) {
                theBmDriver.readyToDisplayNext = true;
                theBmDriver.displayNext();
            } else {
                theBmDriver.cancel();
            }
        });
    }
    this.cancel = function () {
        jQuery("button:contains('Data Components')").click();
        ContentModelViewer.functions.refreshResources();
        this.isDisplayingFinal = false;
    }
    this.displayNext = function () {
        console.log("nextIndex:" + this.nextIndex);
        if (this.isCompleted()) {
            alert("Sequential batch metadata displayNext called after it was already complete.");
            return;
        }
        if (!this.readyToDisplayNext) {
            console.log("Not ready to display next yet");
            return;
        }
        this.readyToDisplayNext = false;
        this.isRunning = true;
        this.isStarted = true;
        var currId = this.fedoraIds[this.nextIndex];
        var theBmDriver = this;
        jQuery(".extjs-center-panel:visible").text("Processing...");
        setTimeout(function () {
            theBmDriver.displayPid(currId);
        }, 2000);
    }
    this.displayPid = function (currId) {
        var resOver = Ext.getCmp('cmvtabpanel').getComponent('resource-overview');
        resOver.pid = currId;
        jQuery("button:contains('Data Components')").click();
        var theBmDriver = this;
        resOver.loadContent(
                Drupal.settings.basePath + "viewer/" + currId + "/metadata_form"
                , null //Params
                , function (loader, response, options) {
                    theBmDriver.introduceCancels();
                    if (typeof response.responseText !== 'undefined') {
                        jQuery("#content-model-viewer-edit-metadata-form").hide();
                        data = JSON.parse(response.responseText);
                        //this information will spell out if we need to get the MODS or if we need to get the FGDC data
                        var modsOrFgdc = "MODS";
                        if (data.data.indexOf("(MODS)") < 0) {
                            modsOrFgdc = "FGDC";
                        }
                        jQuery.ajax({
                            url: Drupal.settings.basePath + "viewer/" + currId + "/" + modsOrFgdc + "/view",
                            success: function (responseText) {
                                var typeToGet = "unknown";
                                if (responseText.indexOf("&lt;/note&gt;") > 1
                                        || responseText.indexOf("&lt;note/&gt;") > 1) {
                                    typeToGet = "General Image Description: (MODS)";
                                }
                                if (responseText.indexOf("&lt;dateOther") > 1) {
                                    typeToGet = "Camera Trap Image: (MODS)";
                                }
                                if (responseText.indexOf("&lt;placeTerm") > 1) {
                                    typeToGet = "Digitized Text (PDF)";
                                }
                                if (responseText.indexOf("&lt;name displayLabel") > 1) {
                                    typeToGet = "Field Book";
                                }
                                if (modsOrFgdc == "FGDC") {
                                    typeToGet = "Tabular";
                                }
                                console.log('typeToGet:' + typeToGet);
                                jQuery("#edit-forms").val(typeToGet);
                                ContentModelViewer.functions.loadResourceEditMetadataForm();
                            }, error: function (errorStuff) {
                                Ext.Msg.alert("Got a HTTP error, maybe the ID was incorrect?");
                            }
                        });
                    }
                }
        );
        this.nextIndex++;
        //check isCompleted to see if you should call displayNext
        if (this.isCompleted()) {
            this.isRunning = false;
            this.isDisplayingFinal = true;
        }
    }
    this.introduceCancels = function () {
        //console.log("introduce batch metadata cancels");

        //The non-cancel "cancels"
        jQuery("button:contains('Manage')").click(function () {
            //console.log("cancelling batch metadata - manage clicked");
            jQuery("#resource-metadata-form").text("Batch Metadata cancelled. Select a data component on the Data Component tab to load information.")
            window.bm = null;
        });
        jQuery("button:contains('Viewer')").click(function () {
            //console.log("cancelling batch metadata - viewer clicked");
            jQuery("#resource-metadata-form").text("Batch Metadata cancelled. Select a data component on the Data Component tab to load information.")
            window.bm = null;
        });
        jQuery("button:contains('Concept Overview')").click(function () {
            //console.log("cancelling batch metadata - concept overview clicked");
            jQuery("#resource-metadata-form").text("Batch Metadata cancelled. Select a data component on the Data Component tab to load information.")
            window.bm = null;
        });
        jQuery("button:contains('Data Components')").click(function () {
            //console.log("cancelling batch metadata - resources clicked");
            jQuery("#resource-metadata-form").text("Batch Metadata cancelled. Select a data component on the Data Component tab to load information.")
            window.bm = null;
        });
    }
}

