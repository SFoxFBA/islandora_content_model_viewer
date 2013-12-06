<?php

/**
 * @file
 *
 */

/**
 *
 */
class Collection {
  /**
   * 12 characters in "info:fedora/"
   */
  const MODEL_PREFIX_LENGTH = 12;
  /**
   * The definitive collection model, an object is considered a collection if it has this as a model
   * or its parent model has this as a model.
   */
  const COLLECTION_MODEL = 'islandora:collectionCModel';

  /**
   * The pid of this Collection.
   *
   * @var string
   */
  protected $pid;

  /**
   * Named default properties.
   *
   * @var array
   */
  protected $default;

  /**
   * Determines if the given pid is a Collection. An object is considered a
   * collection if it's model is self::COLLECTION_MODEL or its parent model has this as a model.
   *
   * @return boolean
   *   TRUE if the given object is a Collection FALSE otherwise.
   */
  public static function isCollection($pid) {
    module_load_include('inc', 'fedora_repository', 'ContentModel');
    if (($content_model = ContentModel::loadFromObject($pid)) !== FALSE) {
      return self::isModelCollection($content_model->pid);
    }
    return FALSE;
  }

  /**
   * Given the objects Model and Parent Models determine if its a Collection object.
   *
   * @param string $model
   *
   * @return boolean
   *   TRUE if this is a collection object FALSE otherwise.
   */
  private static function isModelCollection($model) {
    /**
     * Is a islandora:collectionCModel or is a
     * immediate decendant of a child of islandora:collectionCModel
     */
    return ($model == self::COLLECTION_MODEL || self::isParentModelCollection($model));
  }

  /**
   * Determines if one of the parent models of the given model are collection objects.
   *
   * @param string $model
   *
   * @return boolean
   *   TRUE if this model's parent model is a collection object FALSE otherwise.
   */
  private static function isParentModelCollection($model) {
    module_load_include('inc', 'fedora_repository', 'ContentModel');
    module_load_include('inc', 'fedora_repository', 'ObjectHelper');
    //$object_helper = new ObjectHelper();
    // $content_models = $object_helper->get_content_models_list($model);
    $repo = tuque_wrapper_get_repository_instance();
    try {
      $object = $repo->getObject($model);
    } catch (Exception $e) { return FALSE; }
    return array_search(self::COLLECTION_MODEL, $object->models) !== FALSE;
  }

  /**
   * Create a Collection class.
   *
   * @param string $pid
   */
  public function __construct($pid) {
    $this->pid = $pid;
    $sort = array(new stdClass(), new stdClass());
    $sort[0]->property = 'label';
    $sort[0]->direction = 'ASC';
    $filter = array(new stdClass());
    $filter[0]->property = 'label';
    $filter[0]->value = NULL;
    $this->default = array(
      'sort' => $sort,
      'filter' => $filter
    );
  }

  /**
   * Looks at POST data for properties and lists all members based on those properties.
   *
   * @return array
   */
  public function getMembers() {
    $offset = isset($_REQUEST['start']) ? $_REQUEST['start'] : 0;
    $limit = isset($_REQUEST['limit']) ? $_REQUEST['limit'] : 5;
    $filter = isset($_REQUEST['filter']) ? json_decode($_REQUEST['filter']) : $this->default['filter'];
    $sort = isset($_REQUEST['sort']) ? json_decode($_REQUEST['sort']) : $this->default['sort'];
    $results = $this->findMembers();
    $results = $this->filter($results, $filter);
    $results = $this->sort($results, $sort);
    list($results, $count) = $this->limit($results, $offset, $limit);
    $results = $this->populate($results, TRUE);
    return array($results, $count);
  }

  public function getTreeMembers() {
    $child_concepts = 'count(select $concept from <#ri> where
      $object <fedora-rels-ext:hasConcept> $concept and
      $concept <fedora-model:state> <fedora-model:Active>)';
    $child_resources = 'count(select $resource from <#ri> where
      $object <fedora-rels-ext:hasResource> $resource and
      $resource <fedora-model:state> <fedora-model:Active>)';
    $query = 'select $object $title $model $created ' . $child_concepts . ' ' . $child_resources . ' from <#ri> where
      <info:fedora/' . $this->pid . '> <fedora-rels-ext:hasConcept> $object and
      $object <fedora-model:state> <fedora-model:Active> and
      $object <fedora-model:label> $title and
      $object <fedora-model:createdDate> $created and
      $object <fedora-model:hasModel> $model
      minus $model <mulgara:is> <info:fedora/si:conceptCModel>
      minus $model <mulgara:is> <info:fedora/fedora-system:FedoraObject-3.0>
      order by $title';
    $results = $this->query($query);
    $results = $this->populate($results);
    return $results;
  }

  // Counts resources.
  public function getChildCount($pid) {
    $count = 'count(select $pid from <#ri> where
      $pid <fedora-model:state> <fedora-model:Active> and
      $object <fedora-rels-ext:hasResource> $pid or
      $object <fedora-rels-ext:hasConcept> $pid)';
    $query = 'select $object $title ' . $count . ' from <#ri> where
      $object <mulgara:is>  <info:fedora/' . $pid . '> and
      $object <fedora-model:label> $title';
    module_load_include('inc', 'fedora_repository', 'CollectionClass');
    $collection = new CollectionClass();
    $results = $collection->getRelatedObjects($pid, 1000000, NULL, $query);
    $results = trim($results);
    if ($results != '') {
      $document = new DOMDocument();
      $document->loadXML($results);
      $path = new DOMXPath($document);
      $path->registerNamespace('sparql', 'http://www.w3.org/2001/sw/DataAccess/rf1/result');
      $results = $path->query('//sparql:result');
      $label = $this->getQueryResultValue('sparql:title', $results->item(0), $path);
      $count = $this->getQueryResultValue('sparql:k0', $results->item(0), $path);
      return array($label, $count);
    }
    return array();
  }

  /**
   *
   * @param type $pid
   * @return type
   */
  public function getParent($pid) {
    $results = $this->findParent($pid);
    $count = count($results);
    return array($results, $count);
  }

  public function getParents($pid) {
    $results = $this->findParents($pid);
    $count = count($results);
    return array($results, $count);
  }

  /**
   * Runs a SPARQL query and returns the results in a array.
   *
   * @return array
   */
  private function findParent($pid) {
    $query = 'select $object $title $model $created from <#ri> where
      $object <fedora-rels-ext:hasConcept> <info:fedora/' . $pid . '> and
      $object <fedora-model:state> <fedora-model:Active> and
      $object <fedora-model:label> $title and
      $object <fedora-model:createdDate> $created and
      $object <fedora-model:hasModel> $model
      minus $model <mulgara:is> <info:fedora/si:conceptCModel>
      minus $model <mulgara:is> <info:fedora/fedora-system:FedoraObject-3.0>
      order by $title';
    return $this->query($query);
  }

  private function findParents($pid) {
    $query = 'select $subject $object from <#ri> where walk(
      $object <fedora-rels-ext:hasConcept> <info:fedora/' . $pid . '> and
      $subject <fedora-rels-ext:hasConcept> $object)';
    return $this->query($query);
  }

  /**
   * Runs a SPARQL query and returns the results in a array.
   *
   * @return array
   */
  private function findMembers() {
    $query = 'select $object $title $model  from <#ri> where
      <info:fedora/' . $this->pid . '> <fedora-rels-ext:hasResource> $object and
      $object <fedora-model:state> <fedora-model:Active> and
      $object <fedora-model:label> $title and
      $object <fedora-model:createdDate> $created and
      $object <fedora-model:hasModel> $model
      minus $model <mulgara:is> <info:fedora/si:resourceCModel>
      minus $model <mulgara:is> <info:fedora/fedora-system:FedoraObject-3.0>
      order by $title';
    return $this->query($query, TRUE);
  }

  /**
   * Launch a SPARQL query. Returns all members found up to 1,000,000 results.
   *
   * @param string $query
   *   SPARQL query.
   *
   * @return array
   */
  private function query($query) {
    module_load_include('inc', 'fedora_repository', 'CollectionClass');
    $collection = new CollectionClass();
    $results = $collection->getRelatedObjects($this->pid, 1000000, NULL, $query);
    $results = trim($results);
    if ($results != '') {
      $document = new DOMDocument();
      $document->loadXML($results);
      $path = new DOMXPath($document);
      $path->registerNamespace('sparql', 'http://www.w3.org/2001/sw/DataAccess/rf1/result');
      $results = $path->query('//sparql:result');
      $num_results = $results->length;
      return ($num_results > 0) ? $this->processQueryResults($results, $path) : array();
    }
    return array();
  }

  /**
   * Process the returned query results and generate the appropriate array of values for each result.
   *
   * @param array $results
   *
   * @return array
   */
  private function processQueryResults(DOMNodeList $results, DOMXPath $path) {
    $ret = array();
    $count = $results->length;
    for ($i = 0; $i < $count; $i++) {
      $ret[] = $this->processQueryResult($results->item($i), $path);
    }
    return $ret;
  }

  /**
   * Processes a single query result returning some basic properties for the object.
   *
   * @param DOMNode $result
   * @param DOMXPath $path
   *
   * @return array
   *   Basic properties of the object/query result.
   */
  private function processQueryResult(DOMNode $result, DOMXPath $path) {
    $pid = $this->getQueryResultValue('sparql:object/@uri', $result, $path);
    $pid = substr($pid, self::MODEL_PREFIX_LENGTH);
    $label = $this->getQueryResultValue('sparql:title', $result, $path);
    $created = $this->getQueryResultValue('sparql:created', $result, $path);
    $concept_count = $this->getQueryResultValue('sparql:k0', $result, $path);
    $resource_count = $this->getQueryResultValue('sparql:k1', $result, $path);
    $count = $concept_count + $resource_count;
    $model = $this->getQueryResultValue('sparql:model/@uri', $result, $path);
    $model = substr($model, self::MODEL_PREFIX_LENGTH);
    return array('pid' => $pid, 'label' => $label, 'created' => $created, 'relatedCount' => $concept_count, 'model' => $model, 'count' => $count);
  }

  /**
   *
   * @param string $field
   * @param DOMNode $result
   * @param DOMXPath $path
   */
  private function getQueryResultValue($field, DOMNode $result, DOMXPath $path) {
    $results = $path->query($field, $result);
    if ($results && $results->length > 0) {
      $result = $results->item(0);
      switch (get_class($result)) {
        case 'DOMAttr':
          return $result->value;
        case 'DOMElement':
          return $result->nodeValue;
      }
    }
    return NULL;
  }

  /**
   * Filter the results based on the search string.
   *
   * @param array $results
   * @param string $search
   *
   * @return array
   */
  private function filter(array $results, $filter) {
    $search = isset($filter[0]->value) ? trim($filter[0]->value) : NULL;
    if (isset($search) && $search != '') {
      $ret = array();
      foreach ($results as $result) {
        $matches = preg_match("/^.*{$search}.*/i", $result['label']);
        if ($matches > 0) {
          $ret[] = $result;
        }
      }
      return $ret;
    }
    return $results;
  }

  /**
   * Sort the results.
   *
   * @param array $results
   * @param string $sort
   *
   * @return array
   */
  private function sort(array $results, $sort) {
    switch ($sort[0]->property) {
      case 'created':
        if ($sort[0]->direction == 'ASC') {
          usort($results, array($this, 'date_newest_sort'));
        }
        else {
          usort($results, array($this, 'date_oldest_sort'));
        }
        break;
      case 'label':
      default:
        if ($sort[0]->direction == 'ASC') {
          usort($results, array($this, 'alpha_asc_sort'));
        }
        else {
          usort($results, array($this, 'alpha_desc_sort'));
        }
        break;
    }
    return $results;
  }

  /**
   * Sort by the title in ascending order.
   *
   * @param string $a
   * @param string $b
   *
   * @return boolean
   */
  private function alpha_asc_sort($a, $b) {
    return strcmp($a['label'], $b['label']);
  }

  /**
   * Sort by the title in descending order.
   *
   * @param string $a
   * @param string $b
   *
   * @return boolean
   */
  private function alpha_desc_sort($a, $b) {
    return strcmp($b['label'], $a['label']);
  }

  /**
   * Sort by the creation date from newest to oldest.
   *
   * @param string $a
   * @param string $b
   *
   * @return boolean
   */
  private function date_newest_sort($a, $b) {
    $a = strtotime($a['created']);
    $b = strtotime($b['created']);
    if ($a == $b) {
      return 0;
    }
    return ($a < $b) ? -1 : 1;
  }

  /**
   * Sort by the creation date from oldest to newest.
   *
   * @param string $a
   * @param string $b
   *
   * @return boolean
   */
  private function date_oldest_sort($a, $b) {
    $a = strtotime($a['created']);
    $b = strtotime($b['created']);
    if ($a == $b) {
      return 0;
    }
    return ($a > $b) ? -1 : 1;
  }

  /**
   * Limit the results to a given range.
   *
   * @param array $results
   * @param integer $offset
   * @param integer $limit
   *
   * @return array
   */
  private function limit(array $results, $offset, $limit) {
    $count = count($results);
    $data = array_slice($results, $offset, $limit);
    return array($data, $count);
  }

  /**
   * Fills out properties for each object.
   *
   * @param array $results
   *
   * @return array
   */
  private function populate($results, $show_type = FALSE) {
    global $base_url;
    foreach ($results as &$result) {
      $pid = $result['pid'];
      $type = $this->getType($pid);
      if ($show_type) {
        $result['label'] = "{$type}: {$result['label']}";
        $result['originalMetadata'] = $this->isMetadataOriginal($pid);
      }
      $result['tn'] = $this->getThumbnail($pid, $type);
      $result['link'] = "$base_url/fedora/repository/$pid";
      $result['isCollection'] = self::isModelCollection($result['model']);
    }
    return $results;
  }

  /**
   *
   * @param type $type
   * @param type $pid
   */
  private function getThumbnail($pid, $type = 'Text') {
    $module_path = drupal_get_path('module', 'content_model_viewer');
    module_load_include('inc', 'fedora_repository', 'api/fedora_item');
    $item = new Fedora_Item($pid);
    if (isset($item->datastreams['TN'])) {
      return url("viewer/$pid/TN/download");
    }
    $image_path = '/' . $module_path . '/images';
    $mime_path = $image_path . '/mime';
    switch ($type) {
      case 'Image':
        return $mime_path . '/image-default.png';
      case 'Audio':
        return $mime_path . '/audio.png';
      case 'Text':
        return $mime_path . '/text-txt.png';
      case 'Video':
        return $mime_path . '/video.png';
      default:
        return $mime_path . '/default.png';
    }
  }

  /**
   *
   * @param type $pid
   * @return type
   */
  private function getType($pid) {
    module_load_include('inc', 'fedora_repository', 'ObjectHelper');
    $types = array(
      'si:datasetCModel' => 'Dataset',
      'si:imageCModel' => 'Image',
      'si:generalImageCModel' => 'Image',
      'si:fieldbookCModel' => 'Text'
    );
    $object_helper = new ObjectHelper();
    $content_models = $object_helper->get_content_models_list($pid);
    foreach ($content_models as $content_model) {
      if (isset($types[$content_model->pid])) {
        return $types[$content_model->pid];
      }
    }
    return 'Text';
  }

  /**
   *
   * @param type $type
   * @param type $pid
   */
  private function isMetadataOriginal($pid) {
    module_load_include('inc', 'fedora_repository', 'api/fedora_item');
    $item = new Fedora_Item($pid);
    if (isset($item->datastreams['RELS-EXT'])) {
      $rels = $item->get_datastream_dissemination('RELS-EXT');
      if (isset($rels)) {
        $document = new DOMDocument();
        $document->loadXML($rels);
        $xpath = new DOMXPath($document);
        $results = $xpath->query('//*[local-name() = "orginal_metadata"]');
        $length = $results->length;
        if ($length >= 1) {
          $node = $results->item(0);
          $value = trim($node->textContent);
          return $value == 'TRUE' ? TRUE : TRUE;
        }
      }
    }
    return FALSE;
  }

  /**
   * Attempts to get the description from the objects DC datastream.
   *
   * @param string $pid
   *   The Fedora Object.
   *
   * @return string
   *   The description from the objects DC if possible, otherwise a default description is returned.
   */
  private function getDescription($pid) {
    module_load_include('inc', 'fedora_repository', 'api/fedora_item');
    $default_description = 'Default Description, Check this object\'s metadata and ensure a description is present.';
    $item = new Fedora_Item($pid);
    $dc = $item->get_datastream_dissemination('DC');
    $count = 0;
    if (isset($dc)) {
      $document = new DOMDocument();
      $document->loadXML($dc);
      $xpath = new DOMXPath($document);
      $xpath->registerNamespace('dc', 'http://purl.org/dc/elements/1.1/');
      $results = $xpath->query('//dc:description');
      $count = $results->length;
    }
    if ($count > 0) {
      $description = '';
      for ($i = 0; $i < $count; $i++) {
        $node = $results->item($i);
        $description .= $node->textContent . ' ';
      }
      $description = trim($description);
      return empty($description) ? $default_description : $description;
    }
    return $default_description;
  }

  /**
   * Get Content Model Pid.
   *
   * @param string $pid
   *
   * @return string
   */
  private function getContentModelPid($pid) {
    module_load_include('inc', 'fedora_repository', 'api/fedora_item');
    $item = new Fedora_Item($pid);
    $rels_ext = $item->get_datastream_dissemination('RELS-EXT');
    $document = new DOMDocument();
    $document->loadXML($rels_ext);
    $xpath = new DOMXPath($document);
    $xpath->registerNamespace('rdf', "http://www.w3.org/1999/02/22-rdf-syntax-ns#");
    $xpath->registerNamespace('fedora-model', "info:fedora/fedora-system:def/model#");
    $results = $xpath->query('/rdf:RDF/rdf:Description/fedora-model:hasModel/@rdf:resource');
    return substr($results->item(0)->value, 12); // 12 characteres in "info:fedora/"
  }

}
