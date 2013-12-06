<div id="<?php print $wrapper_id; ?>" class="drupal-content">
   <?php $form = ''; ?>
   <?php switch($action):
case 'edit': ?>
   <?php 
    watchdog("BBB_form_tpl", "getting normal metadata form");
$form = drupal_get_form('content_model_viewer_edit_metadata_form', $pid); ?>
   <?php break;?>
   <?php case 'wizard-meta': ?>
   <?php 
    watchdog("BBB_form_tpl", "getting wizard form");
$form = drupal_get_form('content_model_viewer_edit_metadata_form', $pid); 
   $form = drupal_get_form('content_model_viewer_edit_metadata_wizard_form', $id); ?>
   <?php break;?>
   <?php case 'ingest-concept': ?>
   <?php $form = drupal_get_form('content_model_viewer_ingest_concept_metadata_form', $pid); ?>
   <?php break;?>
   <?php case 'ingest-resource': 
     watchdog("BBB_form_tpl","getting normal ingest resource");
   $form =  drupal_get_form('content_model_viewer_ingest_resource_metadata_form', $pid); ?>
   <?php break;?>
   <?php endswitch; ?>
   <?php print theme_status_messages(); ?>
   <?php print $form; ?>
</div>
