<?php
declare(strict_types=1);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
$projectRoot = dirname(__DIR__);
require_once $projectRoot . '/config/app.php';
require_once $projectRoot . '/config/database.php';

function respond($data, int $status = 200): void { http_response_code($status); header('Content-Type: application/json; charset=utf-8'); echo json_encode($data, JSON_UNESCAPED_SLASHES); exit; }
function fail(string $message, int $status = 400, array $errors = []): void { respond(['error' => $message, 'details' => (object)$errors], $status); }
function body(): array { $v = json_decode(file_get_contents('php://input'), true); if (!is_array($v)) fail('Request body must be a JSON object', 400); return $v; }
function string_field(array $values,string $key,string $default=''): string { $value=$values[$key]??$default;return is_string($value)?trim($value):''; }
function id_value(string $id): int { if (!ctype_digit($id) || (int)$id < 1) fail('Record not found', 404); return (int)$id; }
function user_permissions(string $role): array {
  $permissions=['dashboard.view','handovers.view','handovers.create','tasks.view','incidents.view','notifications.view_own','attendance.view'];
  if(in_array($role,['ADMINISTRATOR','SUPERVISOR'],true))$permissions=array_merge($permissions,['shifts.view_all','handovers.manage','tasks.manage','incidents.manage','users.view','audit.view']);
  else $permissions[]='shifts.view';
  if($role==='ADMINISTRATOR')$permissions=array_merge($permissions,['users.manage','roles.assign','accounts.status.manage','attendance.manage']);
  if($role==='INCOMING_STAFF')$permissions[]='handovers.acknowledge_assigned';
  return $permissions;
}
function user_row(array $u): array { $permissions=user_permissions((string)$u['role']);return ['id'=>(string)$u['id'],'fullName'=>$u['full_name'],'email'=>$u['email'],'role'=>$u['role'],'department'=>$u['department'],'isActive'=>(bool)$u['is_active'],'status'=>(bool)$u['is_active']?'ACTIVE':'DEACTIVATED','permissions'=>$permissions,'defaultRoute'=>in_array($u['role'],['ADMINISTRATOR','SUPERVISOR'],true)?'/dashboard':'/shifts','createdAt'=>$u['created_at']]; }
function user_reference(array $u): array { return ['id'=>(string)$u['id'],'fullName'=>$u['full_name'],'role'=>$u['role'],'department'=>$u['department']]; }
function item_user(int $id): array { $q=db()->prepare('SELECT id,full_name,email,role,department,is_active,created_at FROM users WHERE id=?');$q->execute([$id]);$u=$q->fetch();if(!$u)fail('User not found',404);return $u; }
function current_user(): ?array { if (empty($_SESSION['user_id'])) return null; $q=db()->prepare('SELECT * FROM users WHERE id=? AND is_active=1'); $q->execute([$_SESSION['user_id']]); return $q->fetch() ?: null; }
function auth(): array { $u=current_user(); if (!$u) fail('Authentication required',401); return $u; }
function roles(array $u, array $allowed): void { if (!in_array($u['role'],$allowed,true)) fail('Insufficient permissions',403); }
function json_id($v): string { return (string)$v; }
function distance_m(float $lat1,float $lon1,float $lat2,float $lon2):int{$r=6371000;$dLat=deg2rad($lat2-$lat1);$dLon=deg2rad($lon2-$lon1);$a=sin($dLat/2)**2+cos(deg2rad($lat1))*cos(deg2rad($lat2))*sin($dLon/2)**2;$a=max(0.0,min(1.0,$a));return (int)round($r*2*atan2(sqrt($a),sqrt(1-$a)));}
function notify(PDO $pdo, int $user, string $type, string $title, string $message, ?int $entity = null): void { $s=$pdo->prepare('INSERT INTO notifications(user_id,type,title,message,related_entity_id) VALUES(?,?,?,?,?)'); $s->execute([$user,$type,$title,$message,$entity]); }
function audit(PDO $pdo,int $actor,string $action,string $target,int $targetId,string $details):void { $s=$pdo->prepare('INSERT INTO audit_log(actor_id,action,target_type,target_id,details) VALUES(?,?,?,?,?)');$s->execute([$actor,$action,$target,$targetId,$details]); }
function item(string $table, int $id): array { $allowed=['shifts','handovers','tasks','incidents']; if(!in_array($table,$allowed,true)) fail('Not found',404);$q=db()->prepare("SELECT * FROM {$table} WHERE id=?");$q->execute([$id]);$r=$q->fetch();if(!$r)fail('Record not found',404);return $r; }
function json_record(string $table,array $r):array {
  if($table==='shifts') return ['id'=>(string)$r['id'],'name'=>$r['name'],'startTime'=>$r['start_time'],'endTime'=>$r['end_time'],'date'=>$r['shift_date'],'team'=>$r['team'],'status'=>$r['status'],'supervisorId'=>(string)$r['supervisor_id'],'outgoingStaffId'=>(string)$r['outgoing_staff_id'],'incomingStaffId'=>(string)$r['incoming_staff_id']];
  if($table==='handovers'){ $q=db()->prepare('SELECT task_id,relation FROM handover_tasks WHERE handover_id=?');$q->execute([$r['id']]);$tasks=$q->fetchAll();$q=db()->prepare('SELECT incident_id FROM handover_incidents WHERE handover_id=?');$q->execute([$r['id']]);$incidents=$q->fetchAll();return ['id'=>(string)$r['id'],'shiftId'=>(string)$r['shift_id'],'outgoingStaffId'=>(string)$r['outgoing_staff_id'],'incomingStaffId'=>(string)$r['incoming_staff_id'],'createdById'=>(string)$r['created_by'],'date'=>$r['handover_date'],'priority'=>$r['priority'],'status'=>$r['status'],'submittedAt'=>$r['submitted_at'],'acknowledgedAt'=>$r['acknowledged_at'],'summary'=>$r['summary'],'additionalNotes'=>$r['additional_notes'],'completedTaskIds'=>array_map(fn($x)=>(string)$x['task_id'],array_filter($tasks,fn($x)=>$x['relation']==='COMPLETED')),'pendingTaskIds'=>array_map(fn($x)=>(string)$x['task_id'],array_filter($tasks,fn($x)=>$x['relation']==='PENDING')),'incidentIds'=>array_map(fn($x)=>(string)$x['incident_id'],$incidents)]; }
  if($table==='tasks') return ['id'=>(string)$r['id'],'title'=>$r['title'],'description'=>$r['description'],'priority'=>$r['priority'],'status'=>$r['status'],'assigneeId'=>(string)$r['assignee_id'],'dueDate'=>$r['due_date'],'shiftId'=>(string)$r['shift_id'],'handoverId'=>$r['handover_id']?(string)$r['handover_id']:null,'createdAt'=>$r['created_at'],'updatedAt'=>$r['updated_at']];
  return ['id'=>(string)$r['id'],'title'=>$r['title'],'category'=>$r['category'],'description'=>$r['description'],'severity'=>$r['severity'],'status'=>$r['status'],'shiftId'=>(string)$r['shift_id'],'reportedById'=>(string)$r['reported_by_id'],'resolution'=>$r['resolution'],'createdAt'=>$r['created_at'],'updatedAt'=>$r['updated_at']];
}
function can_see(string $table,array $r,array $u):bool {
  if(in_array($u['role'],['ADMINISTRATOR','SUPERVISOR'],true))return true;
  if($table==='shifts')return (int)$r['outgoing_staff_id']===(int)$u['id']||(int)$r['incoming_staff_id']===(int)$u['id']||(int)$r['supervisor_id']===(int)$u['id'];
  if($table==='handovers')return (int)$r['created_by']===(int)$u['id']||(int)$r['outgoing_staff_id']===(int)$u['id']||(int)$r['incoming_staff_id']===(int)$u['id'];
  if($table==='tasks'){if((int)$r['assignee_id']===(int)$u['id'])return true;$q=db()->prepare('SELECT 1 FROM shifts WHERE id=? AND (outgoing_staff_id=? OR incoming_staff_id=?)');$q->execute([$r['shift_id'],$u['id'],$u['id']]);return (bool)$q->fetchColumn();}
  if($table==='incidents'){if((int)$r['reported_by_id']===(int)$u['id'])return true;$q=db()->prepare('SELECT 1 FROM shifts WHERE id=? AND (outgoing_staff_id=? OR incoming_staff_id=?)');$q->execute([$r['shift_id'],$u['id'],$u['id']]);return (bool)$q->fetchColumn();}
  return false;
}
function rows(string $table,array $u):array {$q=db()->query("SELECT * FROM {$table} ORDER BY id DESC LIMIT 500");$out=[];foreach($q->fetchAll() as $r)if(can_see($table,$r,$u))$out[]=json_record($table,$r);return array_slice($out,0,250);}
function visible_count(string $table,array $u,string $condition='1=1'):int {
  $allowed=['shifts','handovers','tasks','incidents'];if(!in_array($table,$allowed,true))throw new RuntimeException('Unsupported dashboard table');
  if(in_array($u['role'],['ADMINISTRATOR','SUPERVISOR'],true)){$scope='1=1';$params=[];}
  else{$id=(int)$u['id'];$scope=match($table){
    'shifts'=>'(outgoing_staff_id=? OR incoming_staff_id=? OR supervisor_id=?)',
    'handovers'=>'(created_by=? OR outgoing_staff_id=? OR incoming_staff_id=?)',
    'tasks'=>'(assignee_id=? OR shift_id IN (SELECT id FROM shifts WHERE outgoing_staff_id=? OR incoming_staff_id=?))',
    'incidents'=>'(reported_by_id=? OR shift_id IN (SELECT id FROM shifts WHERE outgoing_staff_id=? OR incoming_staff_id=?))',
  };
  $params=match($table){'shifts'=>[$id,$id,$id],'handovers'=>[$id,$id,$id],'tasks'=>[$id,$id,$id],'incidents'=>[$id,$id,$id]};}
  $q=db()->prepare("SELECT COUNT(*) FROM {$table} WHERE ({$scope}) AND ({$condition})");$q->execute($params);return (int)$q->fetchColumn();
}

$config=app_config();
date_default_timezone_set($config['timezone']??'UTC');
header('Cache-Control: no-store');
header('Vary: Origin');
$origin=$_SERVER['HTTP_ORIGIN']??'';
if($config['origin']!=='' && hash_equals($config['origin'],$origin)){header('Access-Control-Allow-Origin: '.$config['origin']);header('Access-Control-Allow-Credentials: true');}
header('Access-Control-Allow-Headers: '.implode(', ',$config['corsHeaders']));header('Access-Control-Allow-Methods: '.implode(', ',$config['corsMethods']));
if(($_SERVER['REQUEST_METHOD']??'GET')==='OPTIONS'){http_response_code(204);exit;}
$method=$_SERVER['REQUEST_METHOD']??'GET';
if(in_array($method,['POST','PATCH','DELETE'],true)&&($config['origin']===''||$origin===''||!hash_equals($config['origin'],$origin))){respond(['error'=>'Request origin is not allowed'],403);}
$forwardedProto=strtolower(trim(explode(',',$_SERVER['HTTP_X_FORWARDED_PROTO']??'')[0]));
$secureCookie=(!empty($_SERVER['HTTPS'])&&strtolower((string)$_SERVER['HTTPS'])!=='off')||strtolower((string)($_SERVER['REQUEST_SCHEME']??''))==='https'||$forwardedProto==='https';
$sameSite=$config['sessionSameSite'];
if($sameSite==='None'&&!$secureCookie)$sameSite='Lax';
if(session_status()!==PHP_SESSION_NONE){error_log('Salim API session configuration error state=session_already_started');respond(['error'=>'Internal server error'],500);}
session_name($config['session']);
session_set_cookie_params(['httponly'=>true,'secure'=>$secureCookie,'samesite'=>$sameSite,'path'=>'/']);
if(!session_start()){error_log('Salim API session configuration error state=session_start_failed');respond(['error'=>'Internal server error'],500);}
$routeQuery=$_GET['route']??null;
$requestPath=is_string($routeQuery)&&$routeQuery!==''?$routeQuery:parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH);
if(!is_string($requestPath))$requestPath='/';
$requestPath=preg_replace('#^/public(?=/api/v1(?:/|$))#','',$requestPath,1)??$requestPath;
$requestPath=preg_replace('#^/backend/public/index\.php(?=/|$)#','',$requestPath,1)??$requestPath;
$path=preg_replace('#^/api/v1(?=/|$)#','',$requestPath,1)??$requestPath;
$path='/'.trim($path,'/');
try {
 if(($path==='/'||$path==='/health')&&$method==='GET'){$healthDb=db();$healthDb->query('SELECT 1');respond(['status'=>'ok','service'=>'salim-operations-api','database'=>'ok','version'=>'1']);}
 if($path==='/auth/login'&&$method==='POST'){
   $b=body();$emailValue=$b['email']??'';$pw=$b['password']??'';$requestedRole=$b['role']??null;
   $allowedRoles=['ADMINISTRATOR','SUPERVISOR','OUTGOING_STAFF','INCOMING_STAFF'];
   if(!is_string($emailValue)||!filter_var(strtolower(trim($emailValue)),FILTER_VALIDATE_EMAIL)||!is_string($pw))fail('Valid email and password are required',422,['email'=>'required','password'=>'required']);
   if($requestedRole!==null&&(!is_string($requestedRole)||!in_array($requestedRole,$allowedRoles,true)))fail('A valid portal type is required',422,['role'=>'invalid']);
   $email=strtolower(trim($emailValue));
   $q=db()->prepare('SELECT * FROM users WHERE email=? AND is_active=1');
   $q->execute([$email]);$u=$q->fetch();
   if(!$u||!password_verify($pw,$u['password_hash']))fail('Invalid email or password',401);
   if($requestedRole!==null&&$u['role']!==$requestedRole)fail('The selected portal does not match your account. Select your correct user type and try again.',403,['role'=>'mismatch']);
   session_regenerate_id(true);$_SESSION['user_id']=$u['id'];audit(db(),(int)$u['id'],'LOGIN','SYSTEM',(int)$u['id'],'Successful login');respond(['user'=>user_row($u)]);
 }
 if($path==='/auth/logout'&&$method==='POST'){ $logoutUser=current_user();if($logoutUser)audit(db(),(int)$logoutUser['id'],'LOGOUT','SYSTEM',(int)$logoutUser['id'],'User logged out');$cookie=session_get_cookie_params();$_SESSION=[];session_destroy();$expiredCookie=['expires'=>time()-42000,'path'=>$cookie['path']?:'/','secure'=>$cookie['secure'],'httponly'=>$cookie['httponly'],'samesite'=>$cookie['samesite']??'Lax'];if($cookie['domain']!=='')$expiredCookie['domain']=$cookie['domain'];setcookie(session_name(),'', $expiredCookie);respond(['ok'=>true]);}
 if($path==='/auth/me'&&$method==='GET'){ $u=current_user();if(!$u)respond(null);respond(user_row($u)); }
 if($path==='/auth/password'&&$method==='POST'){$passwordUser=auth();$b=body();$currentPassword=$b['currentPassword']??'';$newPassword=$b['newPassword']??'';if(!is_string($currentPassword)||!is_string($newPassword)||strlen($newPassword)<12)fail('Validation failed',422,['newPassword'=>'must be at least 12 characters']);if(!password_verify($currentPassword,$passwordUser['password_hash']))fail('Current password is incorrect',422,['currentPassword'=>'incorrect']);$q=db()->prepare('UPDATE users SET password_hash=? WHERE id=?');$q->execute([password_hash($newPassword,PASSWORD_DEFAULT),(int)$passwordUser['id']]);audit(db(),(int)$passwordUser['id'],'PASSWORD_CHANGED','SYSTEM',(int)$passwordUser['id'],'Changed account password');respond(['ok'=>true]);}
  if($path==='/auth/register'&&$method==='POST'){
    $b=body();$name=string_field($b,'fullName');$email=strtolower(string_field($b,'email'));$password=$b['password']??'';$confirmation=$b['passwordConfirmation']??'';$department=string_field($b,'department');$requestedRole=$b['requestedRole']??'';$errors=[];
    if($name===''||strlen($name)>160)$errors['fullName']='required and must be at most 160 characters';
    if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>254)$errors['email']='valid email required';
    if(strlen($department)>120)$errors['department']='must be at most 120 characters';
    if(!in_array($requestedRole,['ADMINISTRATOR','SUPERVISOR','OUTGOING_STAFF','INCOMING_STAFF'],true))$errors['requestedRole']='select a valid portal';
    if(!is_string($password)||strlen($password)<12)$errors['password']='must be at least 12 characters';
    if(!is_string($confirmation)||!is_string($password)||!hash_equals($password,$confirmation))$errors['passwordConfirmation']='passwords must match';
    if($errors)fail('Validation failed',422,$errors);
    $registrationDb=db();$registrationDb->beginTransaction();
    try{
      $q=$registrationDb->prepare('SELECT id FROM users WHERE email=? LIMIT 1');$q->execute([$email]);
      if($q->fetchColumn()){$registrationDb->rollBack();fail('An account already uses this email address',409,['email'=>'already_exists']);}
      $q=$registrationDb->prepare('INSERT INTO users(full_name,email,password_hash,role,department,is_active) VALUES(?,?,?,?,?,1)');
      $q->execute([$name,$email,password_hash($password,PASSWORD_DEFAULT),$requestedRole,$department]);
      $newUserId=(int)$registrationDb->lastInsertId();
      audit($registrationDb,$newUserId,'SELF_REGISTRATION','SYSTEM',$newUserId,'Created active account with role '.$requestedRole);
      $registrationDb->commit();
      respond(['message'=>'Your account is active. You can sign in now.','requiresApproval'=>false],201);
    }catch(PDOException $e){if($registrationDb->inTransaction())$registrationDb->rollBack();$info=$e->errorInfo??[];if((string)($info[0]??$e->getCode())==='23000'&&(string)($info[1]??'')==='1062')fail('An account or pending request already uses this email address',409,['email'=>'already_exists']);throw $e;}
    catch(Throwable $e){if($registrationDb->inTransaction())$registrationDb->rollBack();throw $e;}
  }
 $u=auth();$pdo=db();
 if($path==='/attendance/today'&&$method==='GET'){
   $policy=$pdo->query('SELECT office_name,office_latitude,office_longitude,geofence_radius_m,checkin_grace_minutes FROM attendance_settings WHERE id=1')->fetch();
   $q=$pdo->prepare('SELECT * FROM shifts WHERE shift_date=? AND (supervisor_id=? OR outgoing_staff_id=? OR incoming_staff_id=?) ORDER BY start_time LIMIT 1');$today=date('Y-m-d');$q->execute([$today,(int)$u['id'],(int)$u['id'],(int)$u['id']]);$shift=$q->fetch();
   $policyData=$policy?['officeName'=>$policy['office_name'],'latitude'=>$policy['office_latitude']!==null?(float)$policy['office_latitude']:null,'longitude'=>$policy['office_longitude']!==null?(float)$policy['office_longitude']:null,'radiusMeters'=>(int)$policy['geofence_radius_m'],'graceMinutes'=>(int)$policy['checkin_grace_minutes'],'configured'=>$policy['office_latitude']!==null&&$policy['office_longitude']!==null]:['officeName'=>'Office','latitude'=>null,'longitude'=>null,'radiusMeters'=>150,'graceMinutes'=>15,'configured'=>false];
   if(!$shift)respond(['shift'=>null,'attendance'=>null,'policy'=>$policyData,'handoverSubmitted'=>false,'canAutoCheckIn'=>false,'shouldAskOvertime'=>false]);
   $q=$pdo->prepare('SELECT * FROM attendance_records WHERE shift_id=? AND user_id=?');$q->execute([(int)$shift['id'],(int)$u['id']]);$attendance=$q->fetch()?:null;
   $start=new DateTimeImmutable($shift['shift_date'].' '.$shift['start_time']);$end=new DateTimeImmutable($shift['shift_date'].' '.$shift['end_time']);if($end<=$start)$end=$end->modify('+1 day');$now=new DateTimeImmutable('now');
   $q=$pdo->prepare("SELECT 1 FROM handovers WHERE shift_id=? AND outgoing_staff_id=? AND status IN ('SUBMITTED','DELIVERED','ACKNOWLEDGED','CLOSED') LIMIT 1");$q->execute([(int)$shift['id'],(int)$u['id']]);$hasHandover=(bool)$q->fetchColumn();
   respond(['shift'=>json_record('shifts',$shift),'attendance'=>$attendance?['checkInAt'=>$attendance['check_in_at'],'checkInStatus'=>$attendance['check_in_status'],'checkInMode'=>$attendance['check_in_mode'],'checkOutAt'=>$attendance['check_out_at'],'checkOutStatus'=>$attendance['check_out_status'],'checkOutMode'=>$attendance['check_out_mode'],'overtimeDecision'=>$attendance['overtime_decision'],'lastAttemptStatus'=>$attendance['last_attempt_status']]:null,'policy'=>$policyData,'handoverSubmitted'=>$hasHandover,'canAutoCheckIn'=>!empty($policyData['configured'])&&empty($attendance['check_in_at'])&&$now<=$start->modify('+'.(int)$policyData['graceMinutes'].' minutes'),'shouldAskOvertime'=>!empty($policyData['configured'])&&!empty($attendance['check_in_at'])&&empty($attendance['check_out_at'])&&$attendance['overtime_decision']==='PENDING'&&$now>=$end]);
 }
 if($path==='/attendance/settings'&&$method==='PATCH'){
   roles($u,['ADMINISTRATOR']);$b=body();$name=string_field($b,'officeName','Main office');$lat=$b['latitude']??null;$lng=$b['longitude']??null;$radius=$b['radiusMeters']??null;$grace=$b['graceMinutes']??null;
   if($name===''||strlen($name)>120||!is_numeric($lat)||!is_numeric($lng)||!is_numeric($radius)||!is_numeric($grace))fail('Valid office settings are required',422);
   $lat=(float)$lat;$lng=(float)$lng;$radius=(int)$radius;$grace=(int)$grace;
   if($lat < -90||$lat>90||$lng < -180||$lng>180||$radius<25||$radius>2000||$grace<0||$grace>60)fail('Office coordinates, geofence radius, or grace period are outside the allowed range',422);
   $q=$pdo->prepare('UPDATE attendance_settings SET office_name=?,office_latitude=?,office_longitude=?,geofence_radius_m=?,checkin_grace_minutes=?,updated_by=? WHERE id=1');$q->execute([$name,$lat,$lng,$radius,$grace,(int)$u['id']]);respond(['ok'=>true]);
 }
 if($path==='/attendance/records'&&$method==='GET'){
   roles($u,['ADMINISTRATOR']);$dateValue=$_GET['date']??date('Y-m-d');if(!is_string($dateValue)||!preg_match('/^\d{4}-\d{2}-\d{2}$/',$dateValue))fail('A valid date is required',422);
   $q=$pdo->prepare('SELECT ar.*,s.id AS scheduled_shift_id,s.name AS shift_name,u.id AS scheduled_user_id,u.full_name FROM shifts s JOIN users u ON u.id IN (s.supervisor_id,s.outgoing_staff_id,s.incoming_staff_id) LEFT JOIN attendance_records ar ON ar.shift_id=s.id AND ar.user_id=u.id WHERE s.shift_date=? ORDER BY s.start_time,u.full_name');$q->execute([$dateValue]);$out=[];foreach($q as $r)$out[]=['id'=>(string)($r['id']??($r['scheduled_shift_id'].'-'.$r['scheduled_user_id'])),'shiftId'=>(string)$r['scheduled_shift_id'],'shiftName'=>$r['shift_name'],'userId'=>(string)$r['scheduled_user_id'],'fullName'=>$r['full_name'],'checkInAt'=>$r['check_in_at'],'checkInStatus'=>$r['check_in_status'],'checkInMode'=>$r['check_in_mode'],'checkInDistanceMeters'=>$r['check_in_distance_m'],'checkOutAt'=>$r['check_out_at'],'checkOutStatus'=>$r['check_out_status'],'checkOutMode'=>$r['check_out_mode'],'checkOutDistanceMeters'=>$r['check_out_distance_m'],'overtimeDecision'=>$r['overtime_decision']??'PENDING','lastAttemptAt'=>$r['last_attempt_at'],'lastAttemptStatus'=>$r['last_attempt_status'],'lastAttemptDistanceMeters'=>$r['last_attempt_distance_m']];respond($out);
 }
 if($path==='/shifts'&&$method==='POST'){
   roles($u,['ADMINISTRATOR']);$b=body();
   $name=string_field($b,'name');$team=string_field($b,'team');$dateValue=$b['date']??'';$startTime=$b['startTime']??'';$endTime=$b['endTime']??'';
   $supervisorId=is_string($b['supervisorId']??null)?id_value($b['supervisorId']):0;
   $outgoingId=is_string($b['outgoingStaffId']??null)?id_value($b['outgoingStaffId']):0;
   $incomingId=is_string($b['incomingStaffId']??null)?id_value($b['incomingStaffId']):0;
   $errors=[];
   if($name===''||strlen($name)>160)$errors['name']='required and must be at most 160 characters';
   if($team===''||strlen($team)>120)$errors['team']='required and must be at most 120 characters';
   if(!is_string($dateValue)||!preg_match('/^\d{4}-\d{2}-\d{2}$/',$dateValue))$errors['date']='a valid date is required';
   elseif(!checkdate((int)substr($dateValue,5,2),(int)substr($dateValue,8,2),(int)substr($dateValue,0,4)))$errors['date']='a valid date is required';
   foreach(['startTime'=>$startTime,'endTime'=>$endTime] as $field=>$value)if(!is_string($value)||!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/',$value))$errors[$field]='must use 24-hour HH:MM time';
   if($supervisorId<1)$errors['supervisorId']='select an active supervisor';
   if($outgoingId<1)$errors['outgoingStaffId']='select active outgoing staff';
   if($incomingId<1)$errors['incomingStaffId']='select active incoming staff';
   if($outgoingId>0&&$outgoingId===$incomingId)$errors['incomingStaffId']='outgoing and incoming staff must be different users';
   if($errors)fail('Validation failed',422,$errors);
   $q=$pdo->prepare('SELECT id,role FROM users WHERE id IN (?,?,?) AND is_active=1');$q->execute([$supervisorId,$outgoingId,$incomingId]);$assigned=[];foreach($q->fetchAll() as $assignedUser)$assigned[(int)$assignedUser['id']]=$assignedUser['role'];
   if(($assigned[$supervisorId]??null)!=='SUPERVISOR'&&($assigned[$supervisorId]??null)!=='ADMINISTRATOR')fail('The selected supervisor account is not active or has an invalid role',422,['supervisorId'=>'select an active supervisor account']);
   if(($assigned[$outgoingId]??null)!=='OUTGOING_STAFF')fail('The selected outgoing staff account is not active or has an invalid role',422,['outgoingStaffId'=>'select an active outgoing staff account']);
   if(($assigned[$incomingId]??null)!=='INCOMING_STAFF')fail('The selected incoming staff account is not active or has an invalid role',422,['incomingStaffId'=>'select an active incoming staff account']);
   $startTime=strlen($startTime)===5?$startTime.':00':$startTime;$endTime=strlen($endTime)===5?$endTime.':00':$endTime;
   $q=$pdo->prepare("INSERT INTO shifts(name,start_time,end_time,shift_date,team,status,supervisor_id,outgoing_staff_id,incoming_staff_id) VALUES(?,?,?,?,?,'SCHEDULED',?,?,?)");
   $q->execute([$name,$startTime,$endTime,$dateValue,$team,$supervisorId,$outgoingId,$incomingId]);$shiftId=(int)$pdo->lastInsertId();
   audit($pdo,(int)$u['id'],'SHIFT_CREATED','SHIFT',$shiftId,'Created and assigned a scheduled shift');
   respond(json_record('shifts',item('shifts',$shiftId)),201);
 }
 if(preg_match('#^/shifts/(\d+)$#',$path,$m)&&$method==='PATCH'){
   roles($u,['ADMINISTRATOR']);$b=body();$fields=[];$values=[];$shiftId=(int)$m[1];
   foreach(['startTime'=>'start_time','endTime'=>'end_time'] as $key=>$column)if(array_key_exists($key,$b)){if(!is_string($b[$key])||!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/',$b[$key]))fail('Shift times must use 24-hour HH:MM format',422,[$key=>'invalid']);$fields[]="$column=?";$values[]=strlen($b[$key])===5?$b[$key].':00':$b[$key];}
   $assignmentColumns=['supervisorId'=>'supervisor_id','outgoingStaffId'=>'outgoing_staff_id','incomingStaffId'=>'incoming_staff_id'];
   $hasAssignments=(bool)array_intersect(array_keys($b),array_keys($assignmentColumns));
   if($hasAssignments){
     $current=item('shifts',$shiftId);$ids=['supervisorId'=>(int)$current['supervisor_id'],'outgoingStaffId'=>(int)$current['outgoing_staff_id'],'incomingStaffId'=>(int)$current['incoming_staff_id']];
     foreach($assignmentColumns as $key=>$column)if(array_key_exists($key,$b)){$ids[$key]=is_string($b[$key])?id_value($b[$key]):0;if($ids[$key]<1)fail('A valid active account is required',422,[$key=>'invalid']);}
     if($ids['outgoingStaffId']===$ids['incomingStaffId'])fail('Outgoing and incoming staff must be different users',422,['incomingStaffId'=>'must differ from outgoing staff']);
     $q=$pdo->prepare('SELECT id,role FROM users WHERE id IN (?,?,?) AND is_active=1');$q->execute(array_values($ids));$activeRoles=[];foreach($q->fetchAll() as $assignedUser)$activeRoles[(int)$assignedUser['id']]=$assignedUser['role'];
     $expected=['supervisorId'=>['SUPERVISOR','ADMINISTRATOR'],'outgoingStaffId'=>['OUTGOING_STAFF'],'incomingStaffId'=>['INCOMING_STAFF']];
     foreach($expected as $key=>$validRoles)if(array_key_exists($key,$b)&&!in_array($activeRoles[$ids[$key]]??'', $validRoles,true))fail('The selected account is inactive or has an invalid role',422,[$key=>'choose an active account with the matching role']);
     foreach($assignmentColumns as $key=>$column)if(array_key_exists($key,$b)){$fields[]="$column=?";$values[]=$ids[$key];}
   }
   if(!$fields)fail('No shift changes provided',422);$values[]=$shiftId;$q=$pdo->prepare('UPDATE shifts SET '.implode(',',$fields).' WHERE id=?');$q->execute($values);$fresh=item('shifts',$shiftId);audit($pdo,(int)$u['id'],'SHIFT_UPDATED','SHIFT',$shiftId,'Updated shift schedule or staff assignments');respond(json_record('shifts',$fresh));
 }
 if($path==='/attendance/overtime'&&$method==='POST'){
   $b=body();$working=$b['workingOvertime']??null;$lat=$b['latitude']??null;$lng=$b['longitude']??null;if(!is_bool($working)||!is_numeric($lat)||!is_numeric($lng)||(float)$lat < -90||(float)$lat>90||(float)$lng < -180||(float)$lng>180)fail('A yes/no overtime decision and current location are required',422);
   $settings=$pdo->query('SELECT office_latitude,office_longitude,geofence_radius_m,checkin_grace_minutes FROM attendance_settings WHERE id=1')->fetch();if(!$settings||$settings['office_latitude']===null||$settings['office_longitude']===null)fail('Office location has not been configured by an administrator',503);
   $q=$pdo->prepare('SELECT * FROM shifts WHERE shift_date=? AND (supervisor_id=? OR outgoing_staff_id=? OR incoming_staff_id=?) ORDER BY start_time LIMIT 1');$q->execute([date('Y-m-d'),(int)$u['id'],(int)$u['id'],(int)$u['id']]);$shift=$q->fetch();if(!$shift)fail('No shift is assigned to you today',404);
   $distance=distance_m((float)$lat,(float)$lng,(float)$settings['office_latitude'],(float)$settings['office_longitude']);if($distance>(int)$settings['geofence_radius_m'])fail('Overtime decision and check-out must be confirmed inside the office boundary',403,['distanceMeters'=>$distance,'allowedRadiusMeters'=>(int)$settings['geofence_radius_m']]);
   $q=$pdo->prepare('SELECT * FROM attendance_records WHERE shift_id=? AND user_id=?');$q->execute([(int)$shift['id'],(int)$u['id']]);$record=$q->fetch();if(!$record||empty($record['check_in_at']))fail('Check in before responding to the overtime prompt',409);if(!empty($record['check_out_at']))fail('You are already checked out for this shift',409);if($record['overtime_decision']!=='PENDING')fail('The overtime decision has already been recorded',409);
   $start=new DateTimeImmutable($shift['shift_date'].' '.$shift['start_time']);$end=new DateTimeImmutable($shift['shift_date'].' '.$shift['end_time']);if($end<=$start)$end=$end->modify('+1 day');$now=new DateTimeImmutable('now');if($now<$end)fail('The overtime question is available at the scheduled shift end',409);$stamp=$now->format('Y-m-d H:i:s');
   if($working){$q=$pdo->prepare("UPDATE attendance_records SET overtime_decision='YES',overtime_decided_at=?,last_attempt_at=?,last_attempt_status='OVERTIME_CONFIRMED',last_attempt_distance_m=? WHERE id=?");$q->execute([$stamp,$stamp,$distance,(int)$record['id']]);audit($pdo,(int)$u['id'],'OVERTIME_CONFIRMED','SHIFT',(int)$shift['id'],'User confirmed working overtime');respond(['ok'=>true,'overtimeDecision'=>'YES','checkedOut'=>false]);}
   $q=$pdo->prepare("UPDATE attendance_records SET overtime_decision='NO',overtime_decided_at=?,last_attempt_at=?,last_attempt_status='OVERTIME_DECLINED_STILL_CHECKED_IN',last_attempt_distance_m=? WHERE id=?");$q->execute([$stamp,$stamp,$distance,(int)$record['id']]);audit($pdo,(int)$u['id'],'OVERTIME_DECLINED','SHIFT',(int)$shift['id'],'Declined overtime and remained checked in');respond(['ok'=>true,'overtimeDecision'=>'NO','checkedOut'=>false]);
 }
 if(($path==='/attendance/check-in'||$path==='/attendance/check-out')&&$method==='POST'){
   $b=body();$mode=$b['mode']??'MANUAL';$lat=$b['latitude']??null;$lng=$b['longitude']??null;if(!in_array($mode,['AUTO','MANUAL'],true)||!is_numeric($lat)||!is_numeric($lng)||(float)$lat < -90||(float)$lat>90||(float)$lng < -180||(float)$lng>180)fail('Valid location and attendance mode are required',422);
   $settings=$pdo->query('SELECT office_latitude,office_longitude,geofence_radius_m,checkin_grace_minutes FROM attendance_settings WHERE id=1')->fetch();if(!$settings||$settings['office_latitude']===null||$settings['office_longitude']===null)fail('Office location has not been configured by an administrator',503);
   $today=date('Y-m-d');$q=$pdo->prepare('SELECT * FROM shifts WHERE shift_date=? AND (supervisor_id=? OR outgoing_staff_id=? OR incoming_staff_id=?) ORDER BY start_time LIMIT 1');$q->execute([$today,(int)$u['id'],(int)$u['id'],(int)$u['id']]);$shift=$q->fetch();if(!$shift)fail('No shift is assigned to you today',404);
   $distance=distance_m((float)$lat,(float)$lng,(float)$settings['office_latitude'],(float)$settings['office_longitude']);$checkIn=$path==='/attendance/check-in';$eventPrefix=$checkIn?'CHECK_IN':'CHECK_OUT';
   $q=$pdo->prepare('SELECT * FROM attendance_records WHERE shift_id=? AND user_id=?');$q->execute([(int)$shift['id'],(int)$u['id']]);$record=$q->fetch();
   if($distance>(int)$settings['geofence_radius_m']){
     if(!$record){$q=$pdo->prepare('INSERT INTO attendance_records(shift_id,user_id,last_attempt_at,last_attempt_status,last_attempt_distance_m) VALUES(?,?,NOW(),?,?)');$q->execute([(int)$shift['id'],(int)$u['id'],$eventPrefix.'_LOCATION_REJECTED',$distance]);}
     else{$q=$pdo->prepare('UPDATE attendance_records SET last_attempt_at=NOW(),last_attempt_status=?,last_attempt_distance_m=? WHERE id=?');$q->execute([$eventPrefix.'_LOCATION_REJECTED',$distance,(int)$record['id']]);}
     fail('Check-in or check-out was rejected because your device is outside the office boundary',403,['distanceMeters'=>$distance,'allowedRadiusMeters'=>(int)$settings['geofence_radius_m']]);
   }
   $start=new DateTimeImmutable($shift['shift_date'].' '.$shift['start_time']);$end=new DateTimeImmutable($shift['shift_date'].' '.$shift['end_time']);if($end<=$start)$end=$end->modify('+1 day');$now=new DateTimeImmutable('now');$stamp=$now->format('Y-m-d H:i:s');
   if($checkIn){
     if($record&&!empty($record['check_in_at']))fail('You are already checked in for this shift',409);
     if($now>=$end)fail('This shift has ended. Contact a supervisor to correct attendance.',409);
     if($mode==='AUTO'&&$now>$start->modify('+'.(int)$settings['checkin_grace_minutes'].' minutes'))fail('The automatic check-in window has ended. Use manual check-in; your arrival will be marked late.',409,['manualCheckInRequired'=>true]);
     $status=$now<$start?'EARLY':($now<=$start->modify('+'.(int)$settings['checkin_grace_minutes'].' minutes')?'ON_TIME':'LATE');
     if($record){$q=$pdo->prepare('UPDATE attendance_records SET check_in_at=?,check_in_status=?,check_in_mode=?,check_in_distance_m=?,last_attempt_at=?,last_attempt_status=?,last_attempt_distance_m=? WHERE id=?');$q->execute([$stamp,$status,$mode,$distance,$stamp,'CHECK_IN_ACCEPTED',$distance,(int)$record['id']]);}
     else{$q=$pdo->prepare('INSERT INTO attendance_records(shift_id,user_id,check_in_at,check_in_status,check_in_mode,check_in_distance_m,last_attempt_at,last_attempt_status,last_attempt_distance_m) VALUES(?,?,?,?,?,?,?,?,?)');$q->execute([(int)$shift['id'],(int)$u['id'],$stamp,$status,$mode,$distance,$stamp,'CHECK_IN_ACCEPTED',$distance]);}
   }else{
     if(!$record||empty($record['check_in_at']))fail('Check in before checking out',409);
     if(!empty($record['check_out_at']))fail('You are already checked out for this shift',409);
     if($now>=$end&&$record['overtime_decision']==='PENDING')fail('Answer the overtime question before checking out',409);
     if($mode==='AUTO'&&$now<$end)fail('It is not yet your scheduled check-out time',409);
     $status=$now<$end?'EARLY':($now<=$end->modify('+'.(int)$settings['checkin_grace_minutes'].' minutes')?'ON_TIME':'LATE');
     $q=$pdo->prepare('UPDATE attendance_records SET check_out_at=?,check_out_status=?,check_out_mode=?,check_out_distance_m=?,last_attempt_at=?,last_attempt_status=?,last_attempt_distance_m=? WHERE id=?');$q->execute([$stamp,$status,$mode,$distance,$stamp,'CHECK_OUT_ACCEPTED',$distance,(int)$record['id']]);
   }
   $q=$pdo->prepare('SELECT * FROM attendance_records WHERE shift_id=? AND user_id=?');$q->execute([(int)$shift['id'],(int)$u['id']]);$saved=$q->fetch();audit($pdo,(int)$u['id'],$checkIn?'ATTENDANCE_CHECKED_IN':'ATTENDANCE_CHECKED_OUT','SHIFT',(int)$shift['id'],$eventPrefix.' '.$status.' via '.$mode);respond(['ok'=>true,'status'=>$status,'mode'=>$mode,'at'=>$stamp,'distanceMeters'=>$distance,'attendance'=>['checkInAt'=>$saved['check_in_at'],'checkInStatus'=>$saved['check_in_status'],'checkInMode'=>$saved['check_in_mode'],'checkOutAt'=>$saved['check_out_at'],'checkOutStatus'=>$saved['check_out_status'],'checkOutMode'=>$saved['check_out_mode']]]);
 }
 if($path==='/directory'&&$method==='GET'){
   if(in_array($u['role'],['ADMINISTRATOR','SUPERVISOR'],true)){$q=$pdo->query('SELECT id,full_name,role,department FROM users ORDER BY full_name');respond(array_map('user_reference',$q->fetchAll()));}
   $uid=(int)$u['id'];$q=$pdo->prepare('SELECT id,full_name,role,department FROM users WHERE id=? UNION SELECT x.id,x.full_name,x.role,x.department FROM users x JOIN shifts s ON x.id IN (s.supervisor_id,s.outgoing_staff_id,s.incoming_staff_id) WHERE s.supervisor_id=? OR s.outgoing_staff_id=? OR s.incoming_staff_id=? UNION SELECT x.id,x.full_name,x.role,x.department FROM users x JOIN handovers h ON x.id IN (h.outgoing_staff_id,h.incoming_staff_id) WHERE h.outgoing_staff_id=? OR h.incoming_staff_id=? UNION SELECT x.id,x.full_name,x.role,x.department FROM users x JOIN tasks t ON x.id=t.assignee_id JOIN shifts s ON s.id=t.shift_id WHERE t.assignee_id=? OR s.outgoing_staff_id=? OR s.incoming_staff_id=? OR s.supervisor_id=? UNION SELECT x.id,x.full_name,x.role,x.department FROM users x JOIN incidents i ON x.id=i.reported_by_id JOIN shifts s ON s.id=i.shift_id WHERE i.reported_by_id=? OR s.outgoing_staff_id=? OR s.incoming_staff_id=? OR s.supervisor_id=? ORDER BY full_name');$q->execute(array_fill(0,14,$uid));respond(array_map('user_reference',$q->fetchAll()));
 }
 if($path==='/dashboard'&&$method==='GET'){$du=auth();$active=visible_count('shifts',$du,"status='ACTIVE'");$pending=visible_count('handovers',$du,"status IN ('DRAFT','SUBMITTED','REQUIRES_ATTENTION')");$open=visible_count('tasks',$du,"status NOT IN ('COMPLETED','CANCELLED')");$over=visible_count('tasks',$du,"status='OVERDUE' OR (due_date<NOW() AND status NOT IN ('COMPLETED','CANCELLED'))");$critical=visible_count('incidents',$du,"severity='CRITICAL' AND status NOT IN ('RESOLVED','CLOSED')");respond(['metrics'=>['activeShifts'=>$active,'pendingHandovers'=>$pending,'openTasks'=>$open,'overdueTasks'=>$over,'criticalIncidents'=>$critical],'recentHandovers'=>array_slice(rows('handovers',$du),0,5),'recentTasks'=>array_slice(rows('tasks',$du),0,5),'recentIncidents'=>array_slice(rows('incidents',$du),0,5)]);}
 if($path==='/users'&&$method==='GET'){$viewer=auth();roles($viewer,['ADMINISTRATOR','SUPERVISOR']);$q=db()->query('SELECT id,full_name,email,role,department,is_active,created_at FROM users ORDER BY full_name');respond(array_map('user_row',$q->fetchAll()));}
  if($path==='/registration-requests'&&$method==='GET'){
    roles($u,['ADMINISTRATOR']);$q=$pdo->query("SELECT id,full_name,email,department,requested_role,status,created_at FROM registration_requests WHERE status='PENDING' ORDER BY created_at ASC");$out=[];
    foreach($q as $r)$out[]=['id'=>(string)$r['id'],'fullName'=>$r['full_name'],'email'=>$r['email'],'department'=>$r['department'],'requestedRole'=>$r['requested_role'],'status'=>$r['status'],'createdAt'=>$r['created_at']];
    respond($out);
  }
  if(preg_match('#^/registration-requests/(\\d+)$#',$path,$m)&&$method==='PATCH'){
    roles($u,['ADMINISTRATOR']);$b=body();$decision=$b['decision']??'';$role=$b['role']??'';$department=string_field($b,'department');
    if(!in_array($decision,['APPROVE','REJECT'],true))fail('Validation failed',422,['decision'=>'must be APPROVE or REJECT']);
    if($decision==='APPROVE'&&!in_array($role,['ADMINISTRATOR','SUPERVISOR','OUTGOING_STAFF','INCOMING_STAFF'],true))fail('Validation failed',422,['role'=>'a role must be assigned by an administrator']);
    if(strlen($department)>120)fail('Validation failed',422,['department'=>'must be at most 120 characters']);
    $requestId=(int)$m[1];$pdo->beginTransaction();
    try{
      $q=$pdo->prepare('SELECT id,full_name,email,password_hash,status FROM registration_requests WHERE id=? FOR UPDATE');$q->execute([$requestId]);$request=$q->fetch();
      if(!$request){$pdo->rollBack();fail('Registration request not found',404);}
      if($request['status']!=='PENDING'){$pdo->rollBack();fail('Registration request has already been reviewed',409);}
      if($decision==='APPROVE'){
        $q=$pdo->prepare('SELECT id FROM users WHERE email=? LIMIT 1');$q->execute([$request['email']]);
        if($q->fetchColumn()){$pdo->rollBack();fail('An account already uses this email address',409);}
        $q=$pdo->prepare('INSERT INTO users(full_name,email,password_hash,role,department,is_active) VALUES(?,?,?,?,?,1)');$q->execute([$request['full_name'],$request['email'],$request['password_hash'],$role,$department]);$newUserId=(int)$pdo->lastInsertId();
        $q=$pdo->prepare("UPDATE registration_requests SET status='APPROVED',password_hash=NULL,department=?,reviewed_by=?,reviewed_at=NOW() WHERE id=?");$q->execute([$department,(int)$u['id'],$requestId]);
        audit($pdo,(int)$u['id'],'REGISTRATION_APPROVED','SYSTEM',$newUserId,'Approved registration and assigned role '.$role);
      }else{
        $q=$pdo->prepare("UPDATE registration_requests SET status='REJECTED',password_hash=NULL,reviewed_by=?,reviewed_at=NOW() WHERE id=?");$q->execute([(int)$u['id'],$requestId]);
        audit($pdo,(int)$u['id'],'REGISTRATION_REJECTED','SYSTEM',$requestId,'Rejected registration request');
      }
      $pdo->commit();respond(['ok'=>true,'status'=>$decision==='APPROVE'?'APPROVED':'REJECTED']);
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
  }
 if($path==='/users'&&$method==='POST'){
   roles($u,['ADMINISTRATOR']);$b=body();$name=string_field($b,'fullName');$email=strtolower(string_field($b,'email'));$department=string_field($b,'department');$password=$b['password']??'';$role=$b['role']??'';$errors=[];
   if($name===''||strlen($name)>160)$errors['fullName']='required and must be at most 160 characters';
   if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>254)$errors['email']='valid email required';
   if(strlen($department)>120)$errors['department']='must be at most 120 characters';
   if(!is_string($password)||strlen($password)<12)$errors['password']='must be at least 12 characters';
   if(!in_array($role,['ADMINISTRATOR','SUPERVISOR','OUTGOING_STAFF','INCOMING_STAFF'],true))$errors['role']='invalid role';
   if($errors)fail('Validation failed',422,$errors);
   try{$pdo->beginTransaction();$q=$pdo->prepare('INSERT INTO users(full_name,email,password_hash,role,department,is_active) VALUES(?,?,?,?,?,1)');$q->execute([$name,$email,password_hash($password,PASSWORD_DEFAULT),$role,$department]);$newId=(int)$pdo->lastInsertId();audit($pdo,(int)$u['id'],'USER_CREATED','SYSTEM',$newId,'Created account with role '.$role);$pdo->commit();respond(user_row(item_user($newId)),201);}
   catch(PDOException $e){if($pdo->inTransaction())$pdo->rollBack();$info=$e->errorInfo??[];if((string)($info[0]??$e->getCode())==='23000'&&(string)($info[1]??'')==='1062')fail('An account already uses that email address',409,['email'=>'already_exists']);throw $e;}
 }
 if(preg_match('#^/users/(\d+)$#',$path,$m)&&$method==='GET'){$viewer=auth();roles($viewer,['ADMINISTRATOR','SUPERVISOR']);$q=db()->prepare('SELECT id,full_name,email,role,department,is_active,created_at FROM users WHERE id=?');$q->execute([(int)$m[1]]);$user=$q->fetch();if(!$user)fail('User not found',404);respond(user_row($user));}
 if(preg_match('#^/users/(\d+)$#',$path,$m)&&$method==='PATCH'){
   roles($u,['ADMINISTRATOR']);$targetId=(int)$m[1];$q=$pdo->prepare('SELECT id,full_name,email,role,department,is_active,created_at FROM users WHERE id=?');$q->execute([$targetId]);$target=$q->fetch();if(!$target)fail('User not found',404);$b=body();$name=string_field($b,'fullName',(string)$target['full_name']);$email=strtolower(string_field($b,'email',(string)$target['email']));$department=string_field($b,'department',(string)$target['department']);$errors=[];if($name===''||strlen($name)>160)$errors['fullName']='required and must be at most 160 characters';if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($email)>254)$errors['email']='valid email required';if(strlen($department)>120)$errors['department']='must be at most 120 characters';if($errors)fail('Validation failed',422,$errors);
   try{$q=$pdo->prepare('UPDATE users SET full_name=?,email=?,department=? WHERE id=?');$q->execute([$name,$email,$department,$targetId]);audit($pdo,(int)$u['id'],'USER_UPDATED','SYSTEM',$targetId,'Updated account profile');}catch(PDOException $e){$info=$e->errorInfo??[];if((string)($info[0]??$e->getCode())==='23000'&&(string)($info[1]??'')==='1062')fail('An account already uses that email address',409,['email'=>'already_exists']);throw $e;}
   $q=$pdo->prepare('SELECT id,full_name,email,role,department,is_active,created_at FROM users WHERE id=?');$q->execute([$targetId]);respond(user_row($q->fetch()));
 }
 if(preg_match('#^/users/(\d+)/(role|status)$#',$path,$m)&&$method==='PATCH'){
   roles($u,['ADMINISTRATOR']);$targetId=(int)$m[1];$b=body();$q=$pdo->prepare('SELECT id,full_name,email,role,department,is_active,created_at FROM users WHERE id=?');$q->execute([$targetId]);$target=$q->fetch();if(!$target)fail('User not found',404);
   if($m[2]==='role'){$newRole=$b['role']??'';if(!in_array($newRole,['ADMINISTRATOR','SUPERVISOR','OUTGOING_STAFF','INCOMING_STAFF'],true))fail('Validation failed',422,['role'=>'invalid']);if($targetId===(int)$u['id']&&$newRole!==$target['role'])fail('Administrators cannot change their own role',403);if($newRole!==$target['role']&&$target['role']==='ADMINISTRATOR'){ $q=$pdo->prepare("SELECT COUNT(*) FROM users WHERE role='ADMINISTRATOR' AND is_active=1 AND id<>?");$q->execute([$targetId]);if((int)$q->fetchColumn()<1)fail('At least one active administrator must remain',409); }$pdo->prepare('UPDATE users SET role=? WHERE id=?')->execute([$newRole,$targetId]);audit($pdo,(int)$u['id'],'USER_ROLE_CHANGED','SYSTEM',$targetId,'Changed role from '.$target['role'].' to '.$newRole);}
   else{$active=$b['isActive']??null;if(!is_bool($active))fail('Validation failed',422,['isActive'=>'boolean required']);if($targetId===(int)$u['id']&&!$active)fail('Administrators cannot deactivate their own account',403);if(!$active&&$target['role']==='ADMINISTRATOR'&&(bool)$target['is_active']){$q=$pdo->prepare("SELECT COUNT(*) FROM users WHERE role='ADMINISTRATOR' AND is_active=1 AND id<>?");$q->execute([$targetId]);if((int)$q->fetchColumn()<1)fail('At least one active administrator must remain',409);} $pdo->prepare('UPDATE users SET is_active=? WHERE id=?')->execute([$active?1:0,$targetId]);audit($pdo,(int)$u['id'],$active?'USER_ACTIVATED':'USER_DEACTIVATED','SYSTEM',$targetId,$active?'Activated account':'Deactivated account');}
   $q=$pdo->prepare('SELECT id,full_name,email,role,department,is_active,created_at FROM users WHERE id=?');$q->execute([$targetId]);respond(user_row($q->fetch()));
 }
 if(preg_match('#^/(shifts|handovers|tasks|incidents)$#',$path,$m)&&$method==='GET'){$viewer=auth();respond(rows($m[1],$viewer));}
 if($path==='/handover-shifts'&&$method==='GET'){$viewer=auth();$q=db()->query('SELECT * FROM shifts ORDER BY shift_date DESC,start_time DESC LIMIT 500');respond(array_map(fn($r)=>json_record('shifts',$r),$q->fetchAll()));}
 if(preg_match('#^/(shifts|handovers|tasks|incidents)/(\d+)$#',$path,$m)&&$method==='GET'){$viewer=auth();$record=item($m[1],(int)$m[2]);if(!can_see($m[1],$record,$viewer))fail('Record not found',404);respond(json_record($m[1],$record));}
 $u=auth();$pdo=db();
 if($path==='/handovers'&&$method==='POST'){ $b=body();$errors=[];foreach(['shiftId','summary','priority'] as $k)if(!isset($b[$k])||$b[$k]==='')$errors[$k]='required';if(!is_string($b['summary']??null)||strlen(trim($b['summary']))<3)$errors['summary']='must be at least 3 characters';if(!in_array($b['priority']??'', ['LOW','MEDIUM','HIGH','CRITICAL'],true))$errors['priority']='invalid';foreach(['completedTaskIds','pendingTaskIds','incidentIds'] as $k)if(isset($b[$k])&&!is_array($b[$k]))$errors[$k]='must be an array';if(array_intersect($b['completedTaskIds']??[],$b['pendingTaskIds']??[]))$errors['pendingTaskIds']='a task cannot be both completed and pending';if($errors)fail('Validation failed',422,$errors);$s=item('shifts',id_value((string)$b['shiftId']));$pdo->beginTransaction();$q=$pdo->prepare('INSERT INTO handovers(shift_id,outgoing_staff_id,incoming_staff_id,handover_date,priority,status,summary,additional_notes,created_by) VALUES(?,?,?,?,?,?,?,?,?)');$q->execute([$s['id'],$s['outgoing_staff_id'],$s['incoming_staff_id'],$b['date']??$s['shift_date'],$b['priority'],'DRAFT',trim($b['summary']),$b['additionalNotes']??null,$u['id']]);$hid=(int)$pdo->lastInsertId();audit($pdo,(int)$u['id'],'HANDOVER_DRAFT_CREATED','HANDOVER',$hid,'Created handover draft');foreach(($b['completedTaskIds']??[]) as $tid){$task=item('tasks',id_value((string)$tid));if((int)$task['shift_id']!==(int)$s['id']||!can_see('tasks',$task,$u))fail('Task does not belong to this handover shift',403);$q=$pdo->prepare('INSERT INTO handover_tasks(handover_id,task_id,relation) VALUES(?,?,?)');$q->execute([$hid,(int)$task['id'],'COMPLETED']);}foreach(($b['pendingTaskIds']??[]) as $tid){$task=item('tasks',id_value((string)$tid));if((int)$task['shift_id']!==(int)$s['id']||!can_see('tasks',$task,$u))fail('Task does not belong to this handover shift',403);$q=$pdo->prepare('INSERT INTO handover_tasks(handover_id,task_id,relation) VALUES(?,?,?)');$q->execute([$hid,(int)$task['id'],'PENDING']);}foreach(($b['incidentIds']??[]) as $iid){$incident=item('incidents',id_value((string)$iid));if((int)$incident['shift_id']!==(int)$s['id']||!can_see('incidents',$incident,$u))fail('Incident does not belong to this handover shift',403);$q=$pdo->prepare('INSERT INTO handover_incidents(handover_id,incident_id) VALUES(?,?)');$q->execute([$hid,(int)$incident['id']]);}$pdo->commit();respond(json_record('handovers',item('handovers',$hid)),201); }
 if(preg_match('#^/handovers/(\d+)$#',$path,$m)&&$method==='PATCH'){ $b=body();$h=item('handovers',(int)$m[1]);if((int)$h['created_by']!==(int)$u['id']&&!in_array($u['role'],['ADMINISTRATOR','SUPERVISOR'],true))fail('Only the creator or a supervisor or administrator may edit this draft',403);if($h['status']!=='DRAFT')fail('Only draft handovers can be edited',409);if(isset($b['priority'])&&!in_array($b['priority'],['LOW','MEDIUM','HIGH','CRITICAL'],true))fail('Validation failed',422,['priority'=>'invalid']);$summary=trim((string)($b['summary']??$h['summary']));if(strlen($summary)<3)fail('Validation failed',422,['summary'=>'must be at least 3 characters']);$pdo->beginTransaction();$q=$pdo->prepare('UPDATE handovers SET summary=?,additional_notes=?,priority=? WHERE id=?');$q->execute([$summary,$b['additionalNotes']??$h['additional_notes'],$b['priority']??$h['priority'],$h['id']]);audit($pdo,(int)$u['id'],'HANDOVER_DRAFT_UPDATED','HANDOVER',(int)$h['id'],'Updated handover draft');$pdo->commit();respond(json_record('handovers',item('handovers',(int)$m[1]))); }
 if(preg_match('#^/handovers/(\d+)/(submit|acknowledge)$#',$path,$m)&&$method==='POST'){ $h=item('handovers',(int)$m[1]);$isManager=in_array($u['role'],['ADMINISTRATOR','SUPERVISOR'],true);if($m[2]==='submit'&&(int)$h['created_by']!==(int)$u['id']&&!$isManager)fail('Only the creator or a supervisor or administrator may submit this draft',403);$pdo->beginTransaction();if($m[2]==='submit'){if($h['status']!=='DRAFT')fail('Only drafts can be submitted',409);$pdo->prepare("UPDATE handovers SET status='SUBMITTED',submitted_at=NOW() WHERE id=?")->execute([$h['id']]);notify($pdo,(int)$h['incoming_staff_id'],'HANDOVER','Handover submitted','A handover is ready for acknowledgement',(int)$h['id']);audit($pdo,(int)$u['id'],'HANDOVER_SUBMITTED','HANDOVER',(int)$h['id'],'Submitted handover');}else{if($h['status']!=='SUBMITTED')fail('Only submitted handovers can be acknowledged',409);if((int)$h['incoming_staff_id']!==(int)$u['id']&&!$isManager)fail('Only the incoming staff member or a supervisor or administrator may acknowledge this handover',403);$pdo->prepare("UPDATE handovers SET status='ACKNOWLEDGED',acknowledged_at=NOW() WHERE id=?")->execute([$h['id']]);notify($pdo,(int)$h['outgoing_staff_id'],'HANDOVER','Handover acknowledged','The incoming staff acknowledged the handover',(int)$h['id']);audit($pdo,(int)$u['id'],'HANDOVER_ACKNOWLEDGED','HANDOVER',(int)$h['id'],'Acknowledged handover');}$pdo->commit();respond(json_record('handovers',item('handovers',(int)$m[1]))); }
 if($path==='/tasks'&&$method==='POST'){ $b=body();$err=[];foreach(['title','description','priority','status','assigneeId','dueDate','shiftId'] as $k)if(!isset($b[$k])||$b[$k]==='')$err[$k]='required';if(!in_array($b['priority']??'', ['LOW','MEDIUM','HIGH','CRITICAL'],true))$err['priority']='invalid';if(!in_array($b['status']??'', ['PENDING','IN_PROGRESS','COMPLETED','BLOCKED','OVERDUE','CANCELLED'],true))$err['status']='invalid';if($err)fail('Validation failed',422,$err);roles($u,['ADMINISTRATOR','SUPERVISOR']);$shift=item('shifts',id_value((string)$b['shiftId']));$assignee=id_value((string)$b['assigneeId']);$pdo->beginTransaction();$q=$pdo->prepare('INSERT INTO tasks(title,description,priority,status,assignee_id,due_date,shift_id,handover_id) VALUES(?,?,?,?,?,?,?,?)');$q->execute([$b['title'],$b['description'],$b['priority'],$b['status'],$assignee,str_replace('T',' ',$b['dueDate']),(int)$shift['id'],isset($b['handoverId'])?id_value((string)$b['handoverId']):null]);$tid=(int)$pdo->lastInsertId();audit($pdo,(int)$u['id'],'TASK_CREATED','TASK',$tid,'Created task');if($b['priority']==='CRITICAL')notify($pdo,$assignee,'TASK','Critical task requires attention','A critical task was assigned',$tid);$pdo->commit();respond(json_record('tasks',item('tasks',$tid)),201); }
 if(preg_match('#^/tasks/(\d+)$#',$path,$m)&&$method==='PATCH'){ $b=body();$r=item('tasks',(int)$m[1]);$privileged=in_array($u['role'],['ADMINISTRATOR','SUPERVISOR'],true);$allowed=['title'=>'title','description'=>'description','priority'=>'priority','status'=>'status','assigneeId'=>'assignee_id','dueDate'=>'due_date','shiftId'=>'shift_id','handoverId'=>'handover_id'];$sets=[];$vals=[];if(isset($b['priority'])&&!in_array($b['priority'],['LOW','MEDIUM','HIGH','CRITICAL'],true))fail('Validation failed',422,['priority'=>'invalid']);if(isset($b['status'])&&!in_array($b['status'],['PENDING','IN_PROGRESS','COMPLETED','BLOCKED','OVERDUE','CARRIED_FORWARD','CANCELLED'],true))fail('Validation failed',422,['status'=>'invalid']);if(isset($b['status'])&&$b['status']!==$r['status']&&in_array($r['status'],['COMPLETED','CANCELLED'],true))fail('Completed or cancelled tasks cannot be reopened',409);if(!$privileged&&(array_diff(array_keys($b),['status'])||(int)$r['assignee_id']!==(int)$u['id']))fail('Permission denied',403);$newShift=isset($b['shiftId'])?id_value((string)$b['shiftId']):(int)$r['shift_id'];if($newShift!==(int)$r['shift_id']&&(!$privileged||($b['status']??null)!=='CARRIED_FORWARD'))fail('A shift change requires an authorized carry-forward',403);if(($b['status']??null)==='CARRIED_FORWARD'&&!isset($b['shiftId']))fail('Select the destination shift to carry the task forward',422,['shiftId'=>'required']);if(($b['status']??null)==='CARRIED_FORWARD'&&$newShift===(int)$r['shift_id'])fail('Choose a different destination shift',422,['shiftId'=>'must differ from current shift']);if(isset($b['shiftId']))item('shifts',$newShift);foreach($allowed as $key=>$col)if(array_key_exists($key,$b)){$sets[]="$col=?";$vals[]=in_array($key,['assigneeId','handoverId','shiftId'])&&$b[$key]!==null?id_value((string)$b[$key]):$b[$key];}if(!$sets)fail('No editable fields provided',422);$sets[]='updated_at=NOW()';$vals[]=(int)$m[1];$pdo->beginTransaction();$pdo->prepare('UPDATE tasks SET '.implode(',',$sets).' WHERE id=?')->execute($vals);$fresh=item('tasks',(int)$m[1]);if(($b['status']??null)==='CARRIED_FORWARD'&&($r['status']!=='CARRIED_FORWARD'||(int)$r['shift_id']!==$newShift)){notify($pdo,(int)$fresh['assignee_id'],'TASK','Task carried forward','An unresolved task was carried to the next shift',(int)$fresh['id']);audit($pdo,(int)$u['id'],'TASK_CARRIED_FORWARD','TASK',(int)$fresh['id'],'Moved unresolved task to another shift');}elseif(($b['status']??null)==='COMPLETED'&&$r['status']!=='COMPLETED')audit($pdo,(int)$u['id'],'TASK_COMPLETED','TASK',(int)$fresh['id'],'Completed task');elseif(isset($b['status'])&&$r['status']!==$b['status'])audit($pdo,(int)$u['id'],'TASK_STATUS_CHANGED','TASK',(int)$fresh['id'],'Updated task status');if(($b['priority']??null)==='CRITICAL'&&$r['priority']!=='CRITICAL')notify($pdo,(int)$fresh['assignee_id'],'TASK','Critical task requires attention','A task was escalated to critical priority',(int)$fresh['id']);$pdo->commit();respond(json_record('tasks',$fresh)); }
 if($path==='/incidents'&&$method==='POST'){ $b=body();$err=[];foreach(['title','category','description','severity','shiftId'] as $k)if(!isset($b[$k])||trim((string)$b[$k])==='')$err[$k]='required';if(!in_array($b['severity']??'', ['LOW','MEDIUM','HIGH','CRITICAL'],true))$err['severity']='invalid';if($err)fail('Validation failed',422,$err);$shift=item('shifts',id_value((string)$b['shiftId']));if(!can_see('shifts',$shift,$u))fail('Shift not found',404);$pdo->beginTransaction();$q=$pdo->prepare('INSERT INTO incidents(title,category,description,severity,status,shift_id,reported_by_id,resolution) VALUES(?,?,?,?,?,?,?,NULL)');$q->execute([$b['title'],$b['category'],$b['description'],$b['severity'],'REPORTED',$shift['id'],(int)$u['id']]);$iid=(int)$pdo->lastInsertId();$admins=$pdo->query("SELECT id FROM users WHERE is_active=1 AND role IN ('ADMINISTRATOR','SUPERVISOR') AND id<>".(int)$u['id'])->fetchAll();foreach($admins as $a)notify($pdo,(int)$a['id'],'INCIDENT','Incident reported',$b['title'],$iid);audit($pdo,(int)$u['id'],'INCIDENT_REPORTED','INCIDENT',$iid,$b['title']);$pdo->commit();respond(json_record('incidents',item('incidents',$iid)),201); }
 if(preg_match('#^/incidents/(\d+)$#',$path,$m)&&$method==='PATCH'){roles($u,['ADMINISTRATOR','SUPERVISOR']);$b=body();$r=item('incidents',(int)$m[1]);$status=$b['status']??$r['status'];$resolution=$b['resolution']??$r['resolution'];if(!in_array($status,['REPORTED','UNDER_REVIEW','ESCALATED','RESOLVED','CLOSED'],true))fail('Validation failed',422,['status'=>'invalid']);if($r['status']==='CLOSED'&&$status!=='CLOSED')fail('Closed incidents cannot be reopened',409);$pdo->beginTransaction();$pdo->prepare('UPDATE incidents SET status=?,resolution=?,updated_at=NOW() WHERE id=?')->execute([$status,$resolution,(int)$m[1]]);if($status!==$r['status']){if($status==='ESCALATED'){$recipients=$pdo->query("SELECT id FROM users WHERE is_active=1 AND role IN ('ADMINISTRATOR','SUPERVISOR')")->fetchAll();foreach($recipients as $a)notify($pdo,(int)$a['id'],'INCIDENT','Incident escalated',$r['title'],(int)$m[1]);audit($pdo,(int)$u['id'],'INCIDENT_ESCALATED','INCIDENT',(int)$m[1],$r['title']);}elseif($status==='RESOLVED')audit($pdo,(int)$u['id'],'INCIDENT_RESOLVED','INCIDENT',(int)$m[1],$r['title']);else audit($pdo,(int)$u['id'],'INCIDENT_STATUS_CHANGED','INCIDENT',(int)$m[1],$r['title']);}$pdo->commit();respond(json_record('incidents',item('incidents',(int)$m[1]))); }
 if($path==='/notifications'&&$method==='GET'){ $q=$pdo->prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100');$q->execute([$u['id']]);$out=[];foreach($q as $r)$out[]=['id'=>(string)$r['id'],'title'=>$r['title'],'message'=>$r['message'],'isRead'=>(bool)$r['is_read'],'type'=>$r['type'],'userId'=>(string)$r['user_id'],'createdAt'=>$r['created_at'],'relatedEntityId'=>$r['related_entity_id']?(string)$r['related_entity_id']:null];respond($out);}
 if(preg_match('#^/notifications/(\d+)/read$#',$path,$m)&&$method==='POST'){ $q=$pdo->prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?');$q->execute([(int)$m[1],$u['id']]);if(!$q->rowCount())fail('Notification not found',404);respond(['ok'=>true]); }
 if($path==='/notifications/read-all'&&$method==='POST'){$pdo->prepare('UPDATE notifications SET is_read=1 WHERE user_id=?')->execute([$u['id']]);respond(['ok'=>true]);}
 if($path==='/activity'&&$method==='GET'){$activityUser=auth();if(in_array($activityUser['role'],['ADMINISTRATOR','SUPERVISOR'],true))$q=$pdo->query('SELECT a.*,u.full_name AS actor_name FROM audit_log a JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 100');else{$q=$pdo->prepare('SELECT a.*,u.full_name AS actor_name FROM audit_log a JOIN users u ON u.id=a.actor_id WHERE a.actor_id=? ORDER BY a.created_at DESC LIMIT 100');$q->execute([$activityUser['id']]);}$out=[];foreach($q as $r)$out[]=['id'=>(string)$r['id'],'actorId'=>(string)$r['actor_id'],'actorName'=>$r['actor_name'],'action'=>$r['action'],'targetType'=>$r['target_type'],'targetId'=>(string)$r['target_id'],'details'=>$r['details'],'timestamp'=>$r['created_at']];respond($out);}
 fail('Route not found',404);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    $logPath = substr(preg_replace('/[^A-Za-z0-9_\/.:-]/', '?', $path ?? '/') ?? '/', 0, 120);
    $sqlState = 'n/a';
    $driverCode = 'n/a';
    $driverCategory = 'application_error';
    if ($e instanceof PDOException) {
        $errorInfo = is_array($e->errorInfo ?? null) ? $e->errorInfo : [];
        $rawState = (string)($errorInfo[0] ?? $e->getCode());
        $sqlState = substr(preg_replace('/[^A-Za-z0-9]/', '', $rawState) ?? '', 0, 10) ?: 'n/a';
        $rawDriverCode = $errorInfo[1] ?? null;
        $driverCode = is_scalar($rawDriverCode) && preg_match('/^\d+$/', (string)$rawDriverCode) ? (string)$rawDriverCode : 'n/a';
        $driverMessage = (string)($errorInfo[2] ?? $e->getMessage());
        $driverCategory = match (true) {
            stripos($driverMessage, 'could not find driver') !== false => 'pdo_driver_missing',
            in_array($driverCode, ['1142', '1143', '1227'], true) => 'database_write_privilege_denied',
            $driverCode === '1146' => 'database_table_missing',
            stripos($driverMessage, 'access denied') !== false => 'access_denied_or_grants',
            stripos($driverMessage, 'unknown database') !== false => 'database_not_found',
            stripos($driverMessage, 'connection refused') !== false || stripos($driverMessage, 'could not connect') !== false || stripos($driverMessage, 'timed out') !== false || stripos($driverMessage, 'server has gone away') !== false => 'database_unreachable',
            default => 'pdo_error',
        };
    } elseif ($e instanceof RuntimeException && str_contains($e->getMessage(), 'Database configuration')) {
        $driverCategory = 'database_configuration_error';
    }
    error_log('API request failure method=' . preg_replace('/[^A-Z]/', '', $method ?? 'GET') . ' route=' . $logPath . ' exception=' . get_class($e) . ' sqlstate=' . $sqlState . ' driver_code=' . $driverCode . ' driver_category=' . $driverCategory);
    respond(['error' => 'Internal server error'], 500);
}
