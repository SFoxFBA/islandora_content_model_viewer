<?php

// $Id$

/**
 * @file
 *
 */
module_load_include('inc', 'content_model_viewer', 'viewers/AbstractViewer');

class BasicImageViewer extends AbstractViewer {

  /**
   * Adds all of the required javascript/css/etc that this viewer needs to run.
   */
  public function addRequiredResources() {
    // None
  }

  /**
   * Gets a javascript function that must be run for the viewer to be initialized.
   * 
   * The javascript function will be called after the HTML has been rendered for the viewer.
   * 
   * @return string
   *   The javascript initialization function if one exists, NULL otherwise.
   */
  public function getInitializationFunction() {
    return NULL;
  }

  /**
   * Renders the HTML needed for the viewer.
   * 
   * @param string $pid
   *   The Fedora Object.
   * @param string $dsid
   *   The data stream to render.
   * 
   * @return string
   *   The rendered HTML required for showing this viewer.
   */
  public function render($pid, $dsid) {
    global $base_url;
    $url = $base_url . '/viewer/' . $pid . '/' . $dsid . '/ids_iframe';
    
    return "<iframe height='100%' width='100%' src='$url'></iframe>";
    //return "<iframe height='100%' width='100%' src='http://ids.si.edu/ids/dynamic?id=".str_replace('https','http',$url)."'></iframe>";
    //return "<img src='http://ids.si.edu/ids/deliveryService?id=".str_replace('https','http',$url)."'/>";
    //return "<img src='https://ids.si.edu/ids/deliveryService?id=http://workbench.sidora.si.edu/sites/all/themes/smithsonian-theme/logo.png'/>";
    //return "<iframe src='https://ids.si.edu/ids/dynamic?id=http://workbench.sidora.si.edu/sites/all/themes/smithsonian-theme/logo.png'></iframe>";
  }

}
