param(
    [string]$BaseUrl = 'http://127.0.0.1:8000/api/v1'
)

$ErrorActionPreference = 'Stop'
$uri = [Uri]$BaseUrl
if ($uri.Scheme -ne 'http' -or $uri.Host -notin @('127.0.0.1', 'localhost', '::1')) {
    throw 'Safety check: this script only sends requests to a local HTTP API. Use a disposable local database.'
}
$script:ApiRoot = $BaseUrl.TrimEnd('/')
$script:Results = [System.Collections.Generic.List[object]]::new()
trap {
    Write-Host "Stopped: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nExecuted checks: $($script:Results.Count)" -ForegroundColor Yellow
    $script:Results | Format-Table -AutoSize
    exit 1
}

function Read-TestCredential([string]$Label) {
    $email = Read-Host "$Label email (disposable local test account)"
    $secret = Read-Host "$Label password" -AsSecureString
    $credential = [PSCredential]::new($email, $secret)
    return [PSCustomObject]@{
        Email = $credential.UserName
        Password = $credential.GetNetworkCredential().Password
        Session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    }
}

function Get-ErrorResponseText($response) {
    if ($null -eq $response) { return '' }
    if ($response -is [System.Net.Http.HttpResponseMessage]) {
        return $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    }
    if ($response.PSObject.Methods.Name -contains 'GetResponseStream') {
        $stream = $response.GetResponseStream()
        if ($null -eq $stream) { return '' }
        $reader = [System.IO.StreamReader]::new($stream)
        try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
    }
    return ''
}

function Invoke-Api([string]$Method, [string]$Path, $Session, $Body = $null) {
    $request = @{
        Uri = "$script:ApiRoot$Path"
        Method = $Method
        Headers = @{ Origin = 'http://localhost:5173' }
        UseBasicParsing = $true
        ErrorAction = 'Stop'
    }
    if ($null -ne $Session) { $request.WebSession = $Session }
    if ($null -ne $Body) {
        $request.ContentType = 'application/json'
        $request.Body = ConvertTo-Json -InputObject $Body -Depth 12 -Compress
    }
    try {
        $response = Invoke-WebRequest @request
        $status = [int]$response.StatusCode
        $text = $response.Content
    } catch {
        $response = $_.Exception.Response
        if ($null -eq $response) { throw }
        if ($response -is [System.Net.Http.HttpResponseMessage]) {
            $status = [int]$response.StatusCode
        } else {
            $status = [int]$response.StatusCode.value__
        }
        $text = Get-ErrorResponseText $response
    }
    $data = $null
    if (-not [string]::IsNullOrWhiteSpace($text)) {
        try { $data = ConvertFrom-Json -InputObject $text } catch { $data = $null }
    }
    return [PSCustomObject]@{ Status = $status; Data = $data; Text = $text }
}

function Check([string]$Name, [scriptblock]$Action) {
    try {
        & $Action
        $script:Results.Add([PSCustomObject]@{ Test = $Name; Result = 'PASS' })
        Write-Host "PASS  $Name" -ForegroundColor Green
    } catch {
        $script:Results.Add([PSCustomObject]@{ Test = $Name; Result = 'FAIL' })
        Write-Host "FAIL  $Name -- $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

function Expect([string]$Method, [string]$Path, $Session, [int]$Status, $Body = $null) {
    $response = Invoke-Api $Method $Path $Session $Body
    if ($response.Status -ne $Status) {
        $detail = if ($response.Data.error) { $response.Data.error } else { $response.Text }
        throw "$Method $Path returned HTTP $($response.Status), expected $Status. $detail"
    }
    return $response.Data
}

Write-Host 'Local-only Salim API smoke test. Use disposable test accounts and a disposable database.'
$admin = Read-TestCredential 'Administrator account'
$outgoing = Read-TestCredential 'Outgoing staff'
$incoming = Read-TestCredential 'Incoming staff'

Check 'Health endpoint checks the local database' {
    $health = Expect 'GET' '/health' $null 200
    if ($health.status -ne 'ok' -or $health.database -ne 'ok') { throw 'Health response did not report status/database ok.' }
}
Check 'Unauthenticated protected routes are rejected' {
    Expect 'GET' '/auth/me' $null 401 | Out-Null
    Expect 'GET' '/dashboard' $null 401 | Out-Null
}
Check 'Public registration is disabled and staff cannot read the account directory' {
    Expect 'POST' '/auth/register' ([Microsoft.PowerShell.Commands.WebRequestSession]::new()) 403 @{} | Out-Null
}
Check 'Invalid login returns 401' {
    $bad = Invoke-Api 'POST' '/auth/login' ([Microsoft.PowerShell.Commands.WebRequestSession]::new()) @{ email = 'nobody.invalid@example.test'; password = 'wrong-test-password' }
    if ($bad.Status -ne 401) { throw "Invalid login returned HTTP $($bad.Status), expected 401." }
}
Check 'Disposable roles can log in and current-user profiles are returned' {
    foreach ($entry in @(
        @{ Credential = $admin; Roles = @('ADMINISTRATOR') },
        @{ Credential = $outgoing; Roles = @('OUTGOING_STAFF') },
        @{ Credential = $incoming; Roles = @('INCOMING_STAFF') }
    )) {
        $login = Expect 'POST' '/auth/login' $entry.Credential.Session 200 @{ email = $entry.Credential.Email; password = $entry.Credential.Password }
        $entry.Credential.User = $login.user
        if ($entry.Credential.User.role -notin $entry.Roles) { throw "Test account $($entry.Credential.Email) has unexpected role $($entry.Credential.User.role)." }
        $me = Expect 'GET' '/auth/me' $entry.Credential.Session 200
        if ($me.id -ne $entry.Credential.User.id) { throw 'Current-user response does not match the logged-in account.' }
    }
    $admin.Password = $null; $outgoing.Password = $null; $incoming.Password = $null
}

$adminUser = $admin.User
$outgoingUser = $outgoing.User
$incomingUser = $incoming.User
$adminShifts = @()
Check 'Protected list endpoints and disposable shift fixtures are available' {
    foreach ($path in '/shifts','/handovers','/tasks','/incidents','/notifications','/directory','/users','/dashboard') {
        Expect 'GET' $path $admin.Session 200 | Out-Null
    }
    Expect 'GET' '/users' $outgoing.Session 403 | Out-Null
    $scopedDirectory = @(Expect 'GET' '/directory' $outgoing.Session 200)
    if (-not ($scopedDirectory | Where-Object { $_.id -eq $outgoingUser.id })) { throw 'Scoped directory does not include the current staff account.' }
    $adminShifts = @(Expect 'GET' '/shifts' $admin.Session 200)
    $script:TestShift = $adminShifts | Where-Object { $_.outgoingStaffId -eq $outgoingUser.id -and $_.incomingStaffId -eq $incomingUser.id } | Select-Object -First 1
    if ($null -eq $script:TestShift) { throw 'No disposable shift is assigned to the supplied outgoing/incoming test users.' }
    $script:DestinationShift = $adminShifts | Where-Object { $_.id -ne $script:TestShift.id } | Select-Object -First 1
    if ($null -eq $script:DestinationShift) { throw 'Carry-forward test needs a second disposable destination shift.' }
    Expect 'GET' "/shifts/$($script:TestShift.id)" $outgoing.Session 200 | Out-Null
    Expect 'GET' '/shifts/99999999' $admin.Session 404 | Out-Null
}

Check 'Administrator provisions and manages a disposable account safely' {
    $testTag = [Guid]::NewGuid().ToString('N')
    $script:ManagedTestEmail = "salim-test-$testTag@example.test"
    $script:ManagedTestPassword = "Salim-Test-$testTag-Aa9!"
    $newAccount = @{ fullName = 'Disposable API Test'; email = $script:ManagedTestEmail; password = $script:ManagedTestPassword; role = 'OUTGOING_STAFF'; department = 'API Test' }
    $created = Expect 'POST' '/users' $admin.Session 201 $newAccount
    if ($created.role -ne 'OUTGOING_STAFF' -or -not $created.isActive -or -not $created.permissions) { throw 'Created user response is missing server-generated account state.' }
    Expect 'POST' '/users' $admin.Session 409 $newAccount | Out-Null
    $updated = Expect 'PATCH' "/users/$($created.id)" $admin.Session 200 @{ fullName = 'Disposable API Test Updated'; email = $script:ManagedTestEmail; department = 'API Test' }
    if ($updated.fullName -ne 'Disposable API Test Updated') { throw 'Profile update was not returned.' }
    $roleChanged = Expect 'PATCH' "/users/$($created.id)/role" $admin.Session 200 @{ role = 'INCOMING_STAFF' }
    if ($roleChanged.role -ne 'INCOMING_STAFF') { throw 'Role update was not returned.' }
    Expect 'PATCH' "/users/$($created.id)/role" $outgoing.Session 403 @{ role = 'ADMINISTRATOR' } | Out-Null
    Expect 'PATCH' "/users/$($adminUser.id)/role" $admin.Session 403 @{ role = 'SUPERVISOR' } | Out-Null
    Expect 'PATCH' "/users/$($adminUser.id)/status" $admin.Session 403 @{ isActive = $false } | Out-Null
    $deactivated = Expect 'PATCH' "/users/$($created.id)/status" $admin.Session 200 @{ isActive = $false }
    if ($deactivated.status -ne 'DEACTIVATED') { throw 'Deactivation state was not returned.' }
    $disabledLogin = Invoke-Api 'POST' '/auth/login' ([Microsoft.PowerShell.Commands.WebRequestSession]::new()) @{ email = $script:ManagedTestEmail; password = $script:ManagedTestPassword }
    if ($disabledLogin.Status -ne 401) { throw 'Deactivated account was allowed to log in.' }
    $reactivated = Expect 'PATCH' "/users/$($created.id)/status" $admin.Session 200 @{ isActive = $true }
    if ($reactivated.status -ne 'ACTIVE') { throw 'Reactivation state was not returned.' }
    $managedSession = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    Expect 'POST' '/auth/login' $managedSession 200 @{ email = $script:ManagedTestEmail; password = $script:ManagedTestPassword } | Out-Null
    $nextPassword = "$($script:ManagedTestPassword)-Updated"
    Expect 'POST' '/auth/password' $managedSession 422 @{ currentPassword = 'incorrect-test-password'; newPassword = $nextPassword } | Out-Null
    Expect 'POST' '/auth/password' $managedSession 200 @{ currentPassword = $script:ManagedTestPassword; newPassword = $nextPassword } | Out-Null
    Expect 'POST' '/auth/logout' $managedSession 200 | Out-Null
    $script:ManagedTestPassword = $null
}

$stamp = [DateTime]::UtcNow.ToString('yyyyMMddHHmmss')
$dueDate = [DateTime]::Now.AddDays(7).ToString('yyyy-MM-dd HH:mm:ss')
$createdTask = $null
Check 'Admin creates a disposable task and a critical-task notification' {
    $createdTask = Expect 'POST' '/tasks' $admin.Session 201 @{
        title = "API smoke task $stamp"; description = 'Disposable local API test'; priority = 'CRITICAL'; status = 'PENDING'
        assigneeId = $outgoingUser.id; dueDate = $dueDate; shiftId = $script:TestShift.id
    }
    $script:TaskId = $createdTask.id
    if (-not $script:TaskId) { throw 'Task response has no id.' }
    $outgoingNotices = @(Expect 'GET' '/notifications' $outgoing.Session 200)
    if (-not ($outgoingNotices | Where-Object { $_.relatedEntityId -eq $script:TaskId -and $_.type -eq 'TASK' })) { throw 'Critical-task notification was not found for its assignee.' }
}

$createdIncident = $null
Check 'Outgoing staff reports an incident and an admin is notified' {
    $createdIncident = Expect 'POST' '/incidents' $outgoing.Session 201 @{
        title = "API smoke incident $stamp"; category = 'TEST'; description = 'Disposable local API test'
        severity = 'HIGH'; shiftId = $script:TestShift.id
    }
    $script:IncidentId = $createdIncident.id
    $adminNotices = @(Expect 'GET' '/notifications' $admin.Session 200)
    if (-not ($adminNotices | Where-Object { $_.relatedEntityId -eq $script:IncidentId -and $_.type -eq 'INCIDENT' })) { throw 'Incident notification was not found for the admin test user.' }
}

Check 'Failed handover with an invalid incident rolls back its draft and task link' {
    $before = @(Expect 'GET' '/handovers' $outgoing.Session 200).Count
    $badDraft = Invoke-Api 'POST' '/handovers' $outgoing.Session @{
        shiftId = $script:TestShift.id; summary = "Rollback probe $stamp"; priority = 'MEDIUM'
        pendingTaskIds = @($script:TaskId); incidentIds = @('99999999')
    }
    if ($badDraft.Status -ne 404) { throw "Invalid incident reference returned HTTP $($badDraft.Status), expected 404." }
    $after = @(Expect 'GET' '/handovers' $outgoing.Session 200)
    if ($after.Count -ne $before -or ($after | Where-Object { $_.summary -eq "Rollback probe $stamp" })) { throw 'Failed create left a partially committed handover.' }
}

$handover = $null
Check 'Outgoing creates, retrieves, edits, and submits a handover with linked records' {
    $handover = Expect 'POST' '/handovers' $outgoing.Session 201 @{
        shiftId = $script:TestShift.id; date = $script:TestShift.date; priority = 'MEDIUM'; summary = "API smoke handover $stamp"
        additionalNotes = 'Disposable local API test'; completedTaskIds = @(); pendingTaskIds = @($script:TaskId); incidentIds = @($script:IncidentId)
    }
    $script:HandoverId = $handover.id
    $readback = Expect 'GET' "/handovers/$($script:HandoverId)" $outgoing.Session 200
    if ($readback.pendingTaskIds -notcontains $script:TaskId -or $readback.incidentIds -notcontains $script:IncidentId) { throw 'Handover links did not round-trip.' }
    Expect 'PATCH' "/handovers/$($script:HandoverId)" $outgoing.Session 200 @{ summary = "API smoke handover edited $stamp"; additionalNotes = 'Edited locally'; priority = 'HIGH' } | Out-Null
    Expect 'POST' "/handovers/$($script:HandoverId)/submit" $outgoing.Session 200 | Out-Null
    Expect 'POST' "/handovers/$($script:HandoverId)/submit" $outgoing.Session 409 | Out-Null
}

Check 'Incoming acknowledges handover and notification ownership is enforced' {
    $incomingNotices = @(Expect 'GET' '/notifications' $incoming.Session 200)
    $submitNotice = $incomingNotices | Where-Object { $_.relatedEntityId -eq $script:HandoverId -and $_.type -eq 'HANDOVER' } | Select-Object -First 1
    if ($null -eq $submitNotice) { throw 'Incoming user did not receive the submitted-handover notification.' }
    $foreignRead = Invoke-Api 'POST' "/notifications/$($submitNotice.id)/read" $outgoing.Session
    if ($foreignRead.Status -ne 404) { throw "Reading another user's notification returned HTTP $($foreignRead.Status), expected 404." }
    Expect 'POST' "/notifications/$($submitNotice.id)/read" $incoming.Session 200 | Out-Null
    Expect 'POST' "/handovers/$($script:HandoverId)/acknowledge" $incoming.Session 200 | Out-Null
    $outgoingNotices = @(Expect 'GET' '/notifications' $outgoing.Session 200)
    $ackNotice = $outgoingNotices | Where-Object { $_.relatedEntityId -eq $script:HandoverId -and $_.type -eq 'HANDOVER' } | Select-Object -First 1
    if ($null -eq $ackNotice) { throw 'Outgoing user did not receive the acknowledgement notification.' }
}

Check 'Task carry-forward preserves its ID and incident can be resolved' {
    $moved = Expect 'PATCH' "/tasks/$($script:TaskId)" $admin.Session 200 @{ status = 'CARRIED_FORWARD'; shiftId = $script:DestinationShift.id }
    if ($moved.id -ne $script:TaskId -or $moved.shiftId -ne $script:DestinationShift.id) { throw 'Carry-forward did not move the existing task row.' }
    $resolved = Expect 'PATCH' "/incidents/$($script:IncidentId)" $admin.Session 200 @{ status = 'RESOLVED'; resolution = 'Resolved by disposable API smoke test.' }
    if ($resolved.status -ne 'RESOLVED') { throw 'Incident did not resolve.' }
    Expect 'POST' '/notifications/read-all' $admin.Session 200 | Out-Null
    $activity = @(Expect 'GET' '/activity' $admin.Session 200)
    if (-not ($activity | Where-Object { $_.targetId -eq $script:TaskId -and $_.action -eq 'TASK_CARRIED_FORWARD' })) { throw 'Task carry-forward audit event is missing.' }
    if (-not ($activity | Where-Object { $_.targetId -eq $script:IncidentId -and $_.action -eq 'INCIDENT_RESOLVED' })) { throw 'Incident resolution audit event is missing.' }
}

Check 'Logout invalidates the disposable admin session' {
    Expect 'POST' '/auth/logout' $admin.Session 200 | Out-Null
    Expect 'GET' '/auth/me' $admin.Session 401 | Out-Null
}

Write-Host "`nExecuted checks: $($script:Results.Count)"
$script:Results | Format-Table -AutoSize
if ($script:Results.Result -contains 'FAIL') { exit 1 }
Write-Host 'Reminder: the script creates test rows and does not clean them up. Run only against a disposable local database.' -ForegroundColor Yellow
