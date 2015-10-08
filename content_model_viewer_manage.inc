<?php

function content_model_viewer_manage_files_form(array &$form_state, $pid) {
  module_load_include('inc', 'islandora_content_model_forms', 'ManageObjectFilesForm');
  module_load_include('inc', 'fedora_repository', 'ConnectionHelper');
  $connection_helper = new ConnectionHelper();
  $client = $connection_helper->getSoapClient(variable_get('fedora_soap_url', 'http://localhost:8080/fedora/services/access?wsdl'));
  try {
    $manage_form = new ManageObjectFilesForm();
    $output = $manage_form->create($pid, $client, $form_state);
    $output['which_action'] = array(
      '#type' => 'hidden',
      '#value' => 'manage'
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
 * Validate Manage Form.
 *
 * @param array $form
 * @param array $form_state
 */
function content_model_viewer_manage_files_form_validate(array &$form, array &$form_state) {
  module_load_include('inc', 'sidora', 'includes/fbasidora/common');

  switch ($form_state['storage']['step']) {
    case 1: {
        //Find out how many files there are, then ensure that the new ones don't total more than the maximum allowed
        $pid = $form['#parameters'][2];
        //this is copied and pasted code... PUT IN A FUNCTION!
        $result_object = islandora_object_load($pid);
        if ($result_object) {
          $numberofcsvs = 0;
          foreach ($result_object as $datastream) {
            if (preg_match('/^OBJ/', $datastream->id)) {
              $objds = $result_object[$datastream->id];
              $objlabels[$numberofcsvs] = $datastream->label;
              $objdsids[$numberofcsvs] = $datastream->id;
              $numberofcsvs++;
            }
          }
        }

        validate_uploaded_files($form, &$form_state, 20 - $numberofcsvs, 'add');
        $rows = preg_grep('/^row/', array_keys($form));
        foreach ($rows as $row) {
          $rowvalue = $form[$row];
          $objs = preg_grep('/^objs/', array_keys($rowvalue['#post']));
          foreach ($objs as $obj) {
            $objvalue = $rowvalue['#post'][$obj];
            $dsname = substr($objvalue, 0, strpos($objvalue, '-'));
            $dslabel = substr($objvalue, strpos($objvalue, '-') + 1);
            $form_state['values']['dstodelete'][$dsname] = $dslabel;
          }
        }
        $form_state['storage']['step'] ++;
        //$form_state['rebuild'] = TRUE;
        break;
      }
    case 2: {
        $form_state['storage']['step'] ++;
        break;
      }
    default: {
        module_load_include('inc', 'xml_form_api', 'XMLForm');
        $xml_form = new XMLForm($form_state);
        //SFOX need to temporarily turn off the required flags, as the mandatory checks are done as part of publishing
        content_model_viewer_remove_required($form);
        $xml_form->validate($form, $form_state);
        break;
      }
  }
}

function content_model_viewer_manage_files_wizard_form_validate(array &$form, array &$form_state) {
  module_load_include('inc', 'xml_form_api', 'XMLForm');
  $xml_form = new XMLForm($form_state);
  $xml_form->validate($form, $form_state);
}

function content_model_viewer_manage_files_wizard_form(array &$form_state, $pid) {
  module_load_include('inc', 'islandora_content_model_forms', 'ManageObjectFilesForm');
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
    $form_state['storage']['step'] = '1';
    $form_state['storage']['xml'] = true;
    $form_state['submitted'] = true;
    $form_state['values']['form_id'] = 'content_model_viewer_manage_files_form';
    $form_state['values']['op'] = 'Next';
    $form_state['values']['submit'] = 'Next';
    $form_state['values']['which_action'] = 'Edit';
    $form_state['values']['forms'] = $content_model_form_name;
    $form_state['post'] = array();
    $form_state['post']['which_action'] = 'edit';
    $form_state['#submit'][] = 'content_model_viewer_manage_files_wizard_form_submit';

    $connection_helper = new ConnectionHelper();
    $client = $connection_helper->getSoapClient(variable_get('fedora_soap_url', 'http://localhost:8080/fedora/services/access?wsdl'));
    try {
      $manage_form = new ManageObjectFilesForm();
      //var_dump($form_state);
      $output = $manage_form->create($pid, $client, $form_state);

      $output['which_action'] = array(
        '#type' => 'hidden',
        '#value' => 'edit'
      );
      $output['wiz_next'] = array(
        '#type' => 'hidden',
        '#value' => $_SESSION['pid_list'][0],
      );
      $output['#action'] = '/viewer/' . $pid . '/manage_form';
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

function content_model_viewer_manage_files_wizard_form_submit(array &$form, array &$form_state) {
  module_load_include('inc', 'islandora_content_model_forms', 'ManageObjectFilesForm');
  try {
    $manage_form = new ManageObjectFilesForm();
    $manage_form->submit($form, $form_state);
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

/**
 * Submit Edit Form.
 *
 * @param array $form
 * @param array $form_state
 */
function content_model_viewer_manage_files_form_submit(array &$form, array &$form_state) {
  module_load_include('inc', 'islandora_content_model_forms', 'ManageObjectFilesForm');
  try {
    //$manage_form = new ManageObjectFilesForm();
    //$manage_form->submit($form, $form_state);
  }
  catch (Exception $e) {
    $msg = "File: {$e->getFile()}<br/>Line: {$e->getLine()}<br/>Error: {$e->getMessage()}";
    drupal_set_message($msg, 'error');
  }
  //$form_state['redirect'] = "viewer/{$form_state['values']['pid']}/overview";
  //$_SESSION['content_model_viewer_refresh_tree'] = $form_state['values']['pid']; // Yucky hac
  unset($_SESSION['messages']); // Don't display drupal messages to the user for this interface.
}
