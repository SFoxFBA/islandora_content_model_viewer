<html>
<head>
   <?php print $styles; ?>
   <?php print $scripts; ?>
</head>
<body>
<div id="content-model-viewer" style="display:none;">
  <h1><?php print $label; ?></h1>
  <br/>
  <div style="display:none" id="properties">
    <div id="root"><?php print $root; ?></div>
    <div id="rootowner"><?php print $rootowner; ?></div>
    <div id="si_user"><?php print $si_user; ?></div>
    <div id="pid"><?php print $pid; ?></div>
    <div id="dsid"><?php print $dsid; ?></div>
    <div id="view_function"><?php print $view_function; ?></div>
    <div id="is_collection"><?php print $is_collection; ?></div>
    <div id="base_url"><?php print $base_url; ?></div>
    <div id="object_overview_url"><?php print check_url(url($paths['object']['overview'])); ?></div>
    <div id="object_properties_url"><?php print check_url(url($paths['object']['properties'])); ?></div>
    <div id="object_datastreams_url"><?php print check_url(url($paths['object']['datastreams'])); ?></div>
    <div id="object_permission_form_url"><?php print check_url(url($paths['object']['permission_form'])); ?></div>
    <div id="object_metadata_form_url"><?php print check_url(url($paths['object']['metadata_form'])); ?></div>
    <div id="object_publish_form_url"><?php print check_url(url($paths['object']['publish_form'])); //SFOX DTC-148 ?></div>
    <div id="object_manage_form_url"><?php print check_url(url($paths['object']['manage_form'])); ?></div>
    <div id="object_delete_form_url"><?php print check_url(url($paths['object']['delete_form'])); ?></div>
    <div id="object_members_url"><?php print check_url(url($paths['object']['members'])); ?></div>
    <div id="object_treemembers_url"><?php print check_url(url($paths['object']['treemembers'])); ?></div>
    <div id="object_treemember_url"><?php print check_url(url($paths['object']['treemember'])); ?></div>
    <div id="object_remove_relationship_url"><?php print check_url(url($paths['object']['remove_relationship'])); ?></div>
    <div id="object_purge_url"><?php print check_url(url($paths['object']['purge'])); ?></div>
    <div id="object_add_url"><?php print check_url(url($paths['object']['add'])); ?></div>
    <div id="datastream_add_url"><?php print check_url(url($paths['datastream']['add'])); ?></div>
    <div id="datastream_purge_url"><?php print check_url(url($paths['datastream']['purge'])); ?></div>
    <div id="datastream_download_url"><?php print check_url(url($paths['datastream']['download'])); ?></div>
    <div id="datastream_view_url"><?php print check_url(url($paths['datastream']['view'])); ?></div>
    <div id="datastream_properties_url"><?php print check_url(url($paths['datastream']['properties'])); ?></div>
  </div>
  <div style="display:none" id="datastream-download">
    <form id="datastream-download-form" method="GET" action="">
      <input type="submit">Download</input>
    </form>
  </div>
  <div style="display:none" id="datastream-edit">
    <form id="datastream-edit-form" method="POST" action="edit">
      <input type="hidden" name="dsid"/>
      <input type="hidden" name="action"/>
      <input type="submit">Download</input>
    </form>
  </div>
</div>
</body>
</html>