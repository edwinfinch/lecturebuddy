<?php
  // requires php5
  define('UPLOAD_DIR', '../images/');
  $img = $_POST['img'];
  $img = str_replace('data:image/jpg;base64,', '', $img);
  $img = str_replace(' ', '+', $img);
  $data = base64_decode($img);
  $file = UPLOAD_DIR . 'img5' . '.jpg';
  $success = file_put_contents($file, $data);
  print $success ? $file : 'Unable to save the file.';
?>