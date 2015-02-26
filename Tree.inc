<?php

/**
 * @file
 *
 * Helper for generating the proper JSON for populating the Tree panel, which renders
 * Collections aka 'Concepts'
 */

/**
 * Helper class for generating JSON.
 */
class Tree {

  /**
   * PID from url
   * @var string
   */
  private $pid = null;

  /**
   * Repository root pid
   * @var string
   */
  private $root = null;

  /**
   * Node requested by tree
   * @var string
   */
  private $node = null;

  /**
   * Parents of current PID
   * @var type
   */
  private $parents = array();

  /**
   * Constructor
   *
   * @param string $pid
   * @param string $node
   */
  public function __construct($pid, $node = null) {
    global $user;
    $this->pid = $pid;
    $this->node = ($node != 'root' && !empty($node)) ? substr($node, 0, -8) : $node; // Sanitize $node value
    if (in_array('administrator', $user->roles)) {
      $this->root = variable_get('fedora_repository_pid', 'islandora:root');
    }
    else {
      $serialized_data = unserialize($user->data);
      //SFOX DTC-163 Repository managers should be able to see all user's objects
      if (in_array('FBA Sidora Repository Manager', $user->roles)) {
        $this->root = 'fba:user-projects';
      }
      else {
        $this->root = $serialized_data['islandora_user_pid'];
      } //SFOX DTC-163
    }
  }

  /**
   * Get tree returns a JSON formated string of the tree structure requested.
   *
   * @return string
   *   JSON encoded string.
   */
  public function getTree() {
    /**
     * A pid is passed in via the drupal menu that represents the page your on. A second pid is
     * passed by the tree when the nod is expanded. This requested_pid is the pid passed by the tree.
     * If it is not set or if it is root, then we want to build the tree based on the root node,
     * otherwise build the tree for the passed node.
     */
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_start("f:getTree");
    $requested_pid = (!isset($this->node) || $this->node == 'root') ? $this->root : $this->node;
    $this->getParents($this->pid); // Sets an instance variable used in other functions thoughout this function.
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_start("c:buildTree");
    $tree = $this->buildTree($requested_pid);
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_write_out("c:buildTree", "tree builder");
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_write_out("f:getTree", "tree creator");
    return json_encode(array('success' => TRUE, 'data' => $tree, 'parents' => $this->parents));
  }

  /**
   * Recursive function to build tree
   *
   * @param string $pid
   *
   * @return string
   */
  public function buildTree($pid) {
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_start("f:buildTree");
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_start("c:moduleLoad");
    module_load_include('inc', 'content_model_viewer', 'Collection');
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_write_out("c:moduleLoad", "loaded Collection");
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_start("c:collection__con");
    $collection = new Collection($pid);
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_write_out("c:collection__con", "Collection:$pid");
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_start("c:treeMembers");
    $members = $collection->getTreeMembers();
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_write_out("c:treeMembers", "TreeMembers:$pid");
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_start("s:node_creations");
    foreach ($members as $member) {
      $data[] = $this->createNode($member);
    }
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_write_out("s:node_creations", "num nodes:" . count($membes));
    if (module_exists('sidora_performance_monitor'))
      sidora_performance_monitor_write_out("f:buildTree", "tree builder");
    return $data;
  }

  /**
   * Create a node in the tree with the given object properties.
   *
   * @param array $member
   *   The object properties for the given member of some parent collection.
   *
   * @return array
   *   A node definition for the given object properties.
   */
  private function createNode(array $member) {
    $node = array();
    $node['leaf'] = $member['relatedCount'] == 0;
    $node['text'] = (empty($member['label'])) ? $member['pid'] : $member['label'];
    $node['text'] .= $member['count'] ? ' (' . $member['count'] . ')' : '';
    $node['link'] = $member['link'];
    $node['id'] = $member['pid'] . '|||' . rand(10000, 99999);
    $node['pid'] = $member['pid'];
    $node['dsid'] = isset($member['dsid']) ? $member['dsid'] : NULL;
    $node['view'] = isset($member['view']) ? $member['view'] : NULL;
    $node['iconCls'] = preg_replace('/^[^:]*\:/', '', $member['model']) . ' ' . preg_replace('/^[^:]*\:/', '', $member['pid']); // Strip the namespace
    $node['expanded'] = $this->shouldExpandNode($member['pid']);
    //$node['cls'] = $node['expanded'] ? 'x-tree-bold' : '';
    return $node;
  }

  /**
   * Should the node be expanded in the display?
   *
   * @param string $pid
   *   The node in question.
   * @return boolean
   *   TRUE if it should be expanded FALSE otherwise.
   */
  private function shouldExpandNode($pid) {
    return ($pid == $this->pid || in_array($pid, $this->parents) === true);
  }

  /**
   * This function queries the resource index to find all the parents of the requested pid.
   * When we are building the tree, we need to know the parents to know which nodes to expand.
   *
   * @param string $pid
   */
  private function getParents($pid) {
    return; //Thorny does not want the auto expand so just do this for now in case he wants it back
    // Root is expanded by default so make sure the pid is not root
    if ($pid != $this->root) {
      // Load the collection class
      module_load_include('inc', 'content_model_viewer', 'Collection');
      $collection = new Collection($pid);
      // Get the parents of the current pid. If pid has multiple parents, this should be handled.
      /* list($parent, $total) = $collection->getParents($pid);
        foreach ($parent as $k => $arr) {
        if ($arr['pid'] != $this->root) {
        $this->parents[] = $arr['pid'];
        }
        }
        return; */
      list($parent, $total) = $collection->getParent($pid);
      foreach ($parent as $k => $arr) {
        // Make sure we're not at the root pid, otherwise save the returned pid as a parent and check
        // to see if it has a non-root level parent.
        if ($arr['pid'] != $this->root) {
          $this->parents[] = $arr['pid'];
          $this->getParents($arr['pid']);
        }
      }
    }
  }

}
