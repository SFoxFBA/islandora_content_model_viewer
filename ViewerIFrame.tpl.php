<?php global $base_url;  $url = "$base_url/viewer/iframe" . ($pid ? "/$pid" : ''); ?>
<iframe src="<?php print $url; ?>" width="100%" height="6000"></iframe>
<!-- SFOX, changed the width value above from 900 to 100% -->
<!-- SFOX DTC-197, changed the height value from 960 to 6000 -->