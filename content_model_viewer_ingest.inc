<?php

function content_model_viewer_ingest_concept_metadata_form(array &$form_state, $collection_pid) {
  return fedora_repository_ingest_form($form_state, $collection_pid);
}

function content_model_viewer_ingest_concept_metadata_form_validate(array &$form, array &$form_state) {
  fedora_repository_ingest_form_validate($form, $form_state);
}

function content_model_viewer_ingest_concept_metadata_form_submit(array &$form, array &$form_state) {
  $_SESSION['content_model_viewer_refresh_tree'] = $form_state['values']['pid']; // Yucky hack
  $form_state['redirect'] = "viewer/{$form_state['values']['pid']}/overview";
  unset($_SESSION['messages']); // Don't display drupal messages to the user for this interface.
  // Ingestion is handled by sidora hook urg...
}

function content_model_viewer_ingest_resource_metadata_form(array &$form_state, $collection_pid) {
  return content_model_viewer_ingest_metadata_form($form_state, $collection_pid);
}

function content_model_viewer_ingest_resource_metadata_form_validate(array &$form, array &$form_state) {
  //  content_model_viewer_ingest_metadata_form_validate($form, $form_state);
  if ($_POST['uploaded_file_dsid'] == 'OBJ' && $_POST['wizard_check'] == TRUE) {
    content_model_viewer_edit_metadata_wizard_form_validate($form, $form_state);
  }
  else {
    fedora_repository_ingest_form_validate($form, $form_state);
  }
}

function content_model_viewer_ingest_resource_metadata_form_submit(array &$form, array &$form_state) {
  $_SESSION['content_model_viewer_refresh_tree'] = $form_state['values']['pid']; // Yucky hack

  if ($_POST['uploaded_file_dsid'] == 'OBJ' && $_POST['wizard_check'] == TRUE) {
    $form_state['redirect'] = FALSE; //"viewer/{$form_state['values']['pid']}/overview";
  }
  else {
    $form_state['redirect'] = "viewer/{$form_state['values']['pid']}/overview";
  }
  unset($_SESSION['messages']); // Don't display drupal messages to the user for this interface.
  // Ingestion is handled by the sidora hook... urg..
}

function content_model_viewer_ingest_metadata_form(array &$form_state, $collection_pid) {
  if (!user_access('ingest new fedora objects')) {
    drupal_set_message(t('You do not have permission to ingest.'), 'error');
    return FALSE;
  }
  module_load_include('inc', 'fedora_repository', 'SecurityClass');
  $security_class = new SecurityClass();
  if (!$security_class->canIngestHere($collection_pid)) {
    // Queries the collection object for a child security datastream and if found parses it
    // to determine if this user is allowed to ingest in this collection
    // we assume if they are able to modify objects in the collection they can ingest as well.
    drupal_set_message(t('You do not have premission to ingest here.'));
    return FALSE;
  }
  if ($collection_pid == NULL) {
    drupal_set_message(t('You must specify an collection object pid to ingest an object.'), 'error');
    return FALSE;
  }
  module_load_include('inc', 'islandora_content_model_forms', 'IngestObjectMetadataForm');
  try {
    $ingest_form = new IngestObjectMetadataForm();
    $output = $ingest_form->create($collection_pid, NULL, $form_state);
    $output['which_action'] = array(
      '#type' => 'hidden',
      '#value' => 'ingest'
    );
    return $output;
  }
  catch (Exception $e) {
    $msg = "File: {$e->getFile()}<br/>Line: {$e->getLine()}<br/>Error: {$e->getMessage()}";
    drupal_set_message($msg, 'error');
    return array();
  }
}

/**
 * Validate Ingest Form.
 *
 * @param array $form
 * @param array $form_state
 */
function content_model_viewer_ingest_metadata_form_validate(array &$form, array &$form_state) {
  if ($form_state['storage']['step'] == 1) {
    $form_state['storage']['step'] ++;
    $form_state['rebuild'] = TRUE;
  }
  else {
    if (!empty($_FILES['files']['name']['ingest-file-location'])) {
      $file = file_save_upload('ingest-file-location');
      file_move($file->filepath, 0, 'FILE_EXISTS_RENAME');
      $form_state['values']['ingest-file-location'] = $file->filepath;
    }
    if (isset($form_state['values']['ingest-file-location']) && file_exists($form_state['values']['ingest-file-location'])) {
      module_load_include('inc', 'fedora_repository', 'ContentModel');
      module_load_include('inc', 'fedora_repository', 'MimeClass');
      $file = $form_state['values']['ingest-file-location'];
      $content_model_pid = ContentModel::getPidFromIdentifier($form_state['values']['models']);
      $content_model_pid;
      $content_model_dsid = ContentModel::getDSIDFromIdentifier($form_state['values']['models']);
      if (($content_model = ContentModel::loadFromModel($content_model_pid, $content_model_dsid)) !== FALSE) {
        $allowed_mime_types = $content_model->getMimetypes();
        $mimetype = new MimeClass();
        $format = $mimetype->getType($file);
        if (!empty($file)) {
          if (!in_array($format, $allowed_mime_types)) {
            form_set_error('ingest-file-location', t('The uploaded file\'s mimetype (' . $format . ') is not associated with this Content Model. The allowed types are ' .
                    implode(' ', $allowed_mime_types)));
            file_delete($file);
            return;
          }
          elseif (!$content_model->execIngestRules($file, $format)) {
            drupal_set_message(t('Error following Content Model Rules'), 'error');
            foreach (ContentModel::$errors as $error) {
              drupal_set_message($error, 'error');
            }
          }
        }
      }
    }
    module_load_include('inc', 'xml_form_api', 'XMLForm');
    $xml_form = new XMLForm($form_state);
    $xml_form->validate($form, $form_state);
  }
}

/**
 * Submit Ingest Form.
 *
 * @param array $form
 * @param array $form_state
 */
function content_model_viewer_ingest_metadata_form_submit(array &$form, array &$form_state) {
  module_load_include('inc', 'islandora_content_model_forms', 'IngestObjectMetadataForm');
  if ($form_state['storage']['step'] == 2) {
    $ingest_form = new IngestObjectMetadataForm();
    $ingest_form->submit($form, $form_state);

    //TODO we need to remove the default ismemberofcollection relationship and go to a new format of hasConcept or hasResource. This needs to change HACK HACK
    $parent_pid = $form_state['values']['collection_pid'];
    $child_pid = $form_state['values']['pid'];
    $repo = tuque_wrapper_get_repository_instance();
    $parent = $repo->getObject($parent_pid);
    $child = $repo->getObject($child_pid);
    //remove ismember if collection from child
    $child->relationships->remove(RELS_EXT_URI, 'isMemberOfCollection', $parent_pid);

//    $is_imageCModel = in_array('si:imageCModel', $child->models);
//    $is_fieldbookCModel = in_array('si:fieldbookCModel', $child->models);
//    $is_datasetCModel = in_array('si:datasetCModel', $child->models);
    //SFOX
    $predicate = sidora_get_fba_rdf(key($parent), $pid);
    //$predicate = 'hasConcept';
    $model = 'si:conceptCModel';
//    if ($is_imageCModel || $is_fieldbookCModel || $is_datasetCModel) {
    //$predicate = 'hasResource';
//      $model = 'si:resourceCModel';
//    }
    $parent->relationships->add(RELS_EXT_URI, $predicate, $child_pid);

    $child->relationships->add(FEDORA_MODEL_URI, 'hasModel', $model);

    $_SESSION['content_model_viewer_refresh_tree'] = $form_state['values']['pid']; // Yucky hack
  }
  $form_state['redirect'] = "viewer/{$form_state['values']['pid']}/overview";
  unset($_SESSION['messages']); // Don't display drupal messages to the user for this interface.
}
