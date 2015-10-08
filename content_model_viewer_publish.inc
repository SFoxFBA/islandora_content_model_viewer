<?php

function content_model_viewer_publish_dataset_form(array &$form_state, $collection_pid) {
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
  module_load_include('inc', 'islandora_content_model_forms', 'PublishObjectMetadataForm');
  module_load_include('inc', 'fedora_repository', 'ConnectionHelper');
  try {
    $publish_form = new PublishObjectMetadataForm();
    $connection_helper = new ConnectionHelper();
    $client = $connection_helper->getSoapClient(variable_get('fedora_soap_url', 'http://localhost:8080/fedora/services/access?wsdl'));

    $output = $publish_form->create($collection_pid, $client, $form_state);
    $output['which_action'] = array(
      '#type' => 'hidden',
      '#value' => 'publish'
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
 * Validate Publish Form.
 *
 * @param array $form
 * @param array $form_state
 */
function content_model_viewer_publish_dataset_form_validate(array &$form, array &$form_state) {
  if ($form_state['storage']['step'] == 1) {
    $form_state['storage']['step'] ++;
    $form_state['rebuild'] = TRUE;
  }
  else
  if ($form_state['storage']['step'] == 2) {
    if ($form_state['values']['acceptlicence'] == 0) {
      form_set_error('licence agreement', 'You must agree to the licence to proceed.');
      $form_state['form_has_errors'] = TRUE;
    }
    else {
      $form_state['storage']['step'] ++;
      $form_state['rebuild'] = TRUE;
    }
  }
  else {

    //SFOX Don't think it ever gets here
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
 * Submit Form.
 *
 * @param array $form
 * @param array $form_state
 */
function content_model_viewer_publish_dataset_form_submit(array &$form, array &$form_state) {
  module_load_include('inc', 'islandora_content_model_forms', 'PublishObjectMetadataForm');
  if ($form_state['storage']['step'] == 2) {
    $ingest_form = new PublishObjectMetadataForm();
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

function content_model_viewer_publish_dataset_wizard_form_validate(array &$form, array &$form_state) {
  module_load_include('inc', 'xml_form_api', 'XMLForm');
  $xml_form = new XMLForm($form_state);
  $xml_form->validate($form, $form_state);
}

//SFOX DTC-148
function content_model_viewer_publish_dataset_wizard_form(array &$form_state, $pid) {
  module_load_include('inc', 'islandora_content_model_forms', 'PublishObjectMetadataForm');
  module_load_include('inc', 'fedora_repository', 'ConnectionHelper');
  $current_pid = $pid = $_SESSION['current_pid'];
  $last_pid = $_SESSION['last_pid'];
  if (isset($_POST['op'])) {
    $current_pid = $pid = $last_pid;
  }
  $output = NULL;
  if (empty($current_pid) && is_array($_SESSION['pid_list'])) {
    $pulled_pid = array_pop($_SESSION['pid_list']);
    $current_pid = $pid = $pulled_pid;
  }
  if (!empty($current_pid)) {
    $content_model_form_name = $_SESSION['content_model_form_name'];
    $_SESSION['last_pid'] = $current_pid;
    $_SESSION['current_pid'] = '';
    if (empty($content_model_form_name)) {
      $content_model_form_name = 'General Image Description'; //BBB REMOVE
    }
    $form_state['storage']['step'] = '2';
    $form_state['storage']['xml'] = true;
    $form_state['submitted'] = true;
    $form_state['values']['form_id'] = 'content_model_viewer_publish_form';
    $form_state['values']['op'] = 'Next';
    $form_state['values']['submit'] = 'Next';
    $form_state['values']['which_action'] = 'Publish';
    $form_state['values']['forms'] = $content_model_form_name;
    $form_state['post'] = array();
    $form_state['post']['which_action'] = 'publish';
    $form_state['#submit'][] = 'content_model_viewer_publish_wizard_form_submit';

    $connection_helper = new ConnectionHelper();
    $client = $connection_helper->getSoapClient(variable_get('fedora_soap_url', 'http://localhost:8080/fedora/services/access?wsdl'));
    try {
      $publish_form = new PublishObjectMetadataForm();
      //var_dump($form_state);
      $output = $publish_form->create($pid, $client, $form_state);

      $output['which_action'] = array(
        '#type' => 'hidden',
        '#value' => 'publish'
      );
      $output['wiz_next'] = array(
        '#type' => 'hidden',
        '#value' => $_SESSION['pid_list'][0],
      );
      $output['#action'] = '/viewer/' . $pid . '/publish_form';
      //var_dump($output);
      unset($_SESSION['messages']); // Don't display drupal messages to the user for this interface.
    }
    catch (Exception $e) {
      $msg = "File: {$e->getFile()}<br/>Line: {$e->getLine()}<br/>Error: {$e->getMessage()}";
      drupal_set_message($msg, 'error');
      return array();
    }
  }
  if ($_SESSION['wizard_finish']) {
    //unset($_SESSION['pid_list']);
    $_SESSION['wizard_finish'] = false;
    $current_pid = NULL;
    $output = NULL;
  }
  if (empty($current_pid)) {
    $form_state['redirect'] = "viewer/{$form_state['values']['pid']}/overview";
    $_SESSION['content_model_viewer_refresh_tree'] = $form_state['values']['pid']; // Yucky hac
    unset($_SESSION['messages']); // Don't display drupal messages to the user for this interface.
  }
  if (!empty($output)) {
    return $output;
  }
}

//SFOX DTC-148
function content_model_viewer_publish_dataset_wizard_form_submit(array &$form, array &$form_state) {
  module_load_include('inc', 'islandora_content_model_forms', 'PublishObjectMetadataForm');
  try {
    $publish_form = new PublishObjectMetadataForm();
    $publish_form->submit($form, $form_state);
    $pid = $form_state['values']['pid'];
    if (empty($_SESSION['initial_upload'])) {
      //this edit form s used to batch create the metadata, and do editing we don't want to initially mark the metadata as edited
      sidora_mark_as_metadata_complete($pid);
    }
  }
  catch (Exception $e) {
    $msg = "File: {$e->getFile()}<br/>Line: {$e->getLine()}<br/>Error: {$e->getMessage()}";
    drupal_set_message($msg, 'error');
  }
  $_SESSION['next_pid'] = $_SESSION['pid_list'][0];
  if (empty($_SESSION['next_pid'])) {
    $form_state['redirect'] = "viewer/{$form_state['values']['pid']}/overview"; //BBB we'll see
    $_SESSION['content_model_viewer_refresh_tree'] = $form_state['values']['pid'];
  }
  else {
    $form_state['redirect'] = "viewer/{$form_state['values']['pid']}/wizard_step/" . $_SESSION['next_pid'];
  }
  unset($_SESSION['messages']); // Don't display drupal messages to the user for this interface.
}