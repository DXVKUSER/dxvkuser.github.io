  <?php
// Shoutcast Server Stats
// Parses shoutcasts xml to make an effective stats thing for any website
// ©2004-2005 Daniel Brown http://www.gmtt.co.uk
// Please refer to the readme file for use.


// Add-On MAXLISTNERS insead of the / 10 MAXLISTENERS which was set, and the BITRATE add-on.
// Online and Offline graphics, and add-on code.
// Better HTML Script.

// Do Not Try To Edit This Only Unless You Know What You're Doing!!!!!!!

include('config_radio.php');

$scfp = fsockopen("$scip", $scport, &$errno, &$errstr, 30);
 if(!$scfp) {
  $scsuccs=1;
echo''.$scdef.' is Offline'; 
 }
if($scsuccs!=1){
 fputs($scfp,"GET /admin.cgi?pass=$scpass&mode=viewxml HTTP/1.0\r\nUser-Agent: SHOUTcast Song Status (Mozilla Compatible)\r\n\r\n");
 while(!feof($scfp)) {
  $page .= fgets($scfp, 1000);
 }
######################################################################################################################
/////////////////////////part 1 \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
//define  xml elements
 $loop = array("STREAMSTATUS", "BITRATE", "SERVERTITLE", "CURRENTLISTENERS", "MAXLISTENERS", "BITRATE");
 $y=0;
 while($loop[$y]!=''){
  $pageed = ereg_replace(".*<$loop[$y]>", "", $page);
  $scphp = strtolower($loop[$y]);
  $$scphp = ereg_replace("</$loop[$y]>.*", "", $pageed);
  if($loop[$y]==SERVERGENRE || $loop[$y]==SERVERTITLE || $loop[$y]==SONGTITLE || $loop[$y]==SERVERTITLE)
   $$scphp = urldecode($$scphp);

// uncomment the next line to see all variables
//echo'$'.$scphp.' = '.$$scphp.'<br>';
  $y++;
 }
//end intro xml elements
######################################################################################################################
######################################################################################################################
/////////////////////////part 2\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
//get song info and history
 $pageed = ereg_replace(".*<SONGHISTORY>", "", $page);
 $pageed = ereg_replace("<SONGHISTORY>.*", "", $pageed);
 $songatime = explode("<SONG>", $pageed);
 $r=1;
 while($songatime[$r]!=""){
  $t=$r-1;
  $playedat[$t] = ereg_replace(".*<PLAYEDAT>", "", $songatime[$r]);
  $playedat[$t] = ereg_replace("</PLAYEDAT>.*", "", $playedat[$t]);
  $song[$t] = ereg_replace(".*<TITLE>", "", $songatime[$r]);
  $song[$t] = ereg_replace("</TITLE>.*", "", $song[$t]);
  $song[$t] = urldecode($song[$t]);
  $dj[$t] = ereg_replace(".*<SERVERTITLE>", "", $page);
  $dj[$t] = ereg_replace("</SERVERTITLE>.*", "", $pageed);
$r++;
 }
//end song info
fclose($scfp);
}

//display stats
if($streamstatus == "1"){
//you may edit the html below, make sure to keep variable intact
echo'
<html>

<head>

<meta http-equiv="Content-Type" content="text/html; charset=windows-1252">
<link rel=stylesheet href="" type="text/css">
<title>'.$scdef.'</title>
</head>

<body text="" bgcolor="">


<p align="center"><center>
<img src="online.jpg"><br>
<b>Stream Title:</b> '.$servertitle.'<br>
<b>Listeners:</b> '.$currentlisteners.' / '.$maxlisteners.'<br>
<b>Bitrate:</b> '.$bitrate.'kbps<br>
<b>Current Song:</b> '.$song[0].'</p><b>
</p>
</body>

</html>';
}
if($streamstatus == "0")
{
//you may edit the html below, make sure to keep variable intact
echo'
<html>

<head>

<meta http-equiv="Content-Type" content="text/html; charset=windows-1252">
<link rel=stylesheet href="" type="text/css">
<title>Radio Server Is Offline</title>
</head>

<body text="" bgcolor="">
<center>
<img src="offline.jpg">
</body>

</html>';
}
?>
