/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
function loadFlexPlayer(pid, dsid) {
  var swfURL, base_url, swfVersionStr, xiSwfUrlStr, flashvars, params, attributes;
  base_url = $('#base_url').text();
  swfURL = base_url + '/viewer/' + pid + '/' + dsid + '/download';
  swfVersionStr = "10.0.0";
  xiSwfUrlStr = "/sites/all/libraries/flexpaper/js/swfobject/expressInstall.swf";
  flashvars = {
    SwfFile : escape(swfURL),
    Scale : 0.6,
    ZoomTransition : "easeOut",
    ZoomTime : 0.5,
    ZoomInterval : 0.1,
    FitPageOnLoad : true,
    FitWidthOnLoad : false,
    PrintEnabled : true,
    FullScreenAsMaxWindow : false,
    ProgressiveLoading : true,
    PrintToolsVisible : true,
    ViewModeToolsVisible : true,
    ZoomToolsVisible : true,
    FullScreenVisible : true,
    NavToolsVisible : true,
    CursorToolsVisible : true,
    SearchToolsVisible : true,
    localeChain: "en_US",
    scaleMode: "exactFit"
  };
  params = {
    quality: "high",
    bgcolor: "#ffffff",
    allowscriptaccess: "sameDomain",
    allowfullscreen: "true"
  };
  attributes = {
    id: "FlexPaperViewer",
    name: "FlexPaperViewer",
    wmode: "transparent"
  };
  swfobject.embedSWF(
    base_url + "/sites/all/libraries/flexpaper/FlexPaperViewer.swf",
    "playerFlexPaper",
    "100%",
    "857",
    swfVersionStr,
    xiSwfUrlStr,
    flashvars,
    params,
    attributes
  );
  swfobject.createCSS("#playerFlexPaper", "display:block;text-align:left;");
}
