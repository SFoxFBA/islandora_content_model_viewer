<?php global $base_url;  $url = "$base_url/viewer/iframe" . ($pid ? "/$pid" : ''); ?>
<iframe src="<?php print $url; ?>" width="900" height="960"></iframe>