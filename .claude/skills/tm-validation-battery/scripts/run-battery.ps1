# Runs the TM Stats validation battery and compares each result against the
# recorded baselines in baselines.json.
#
# It authorizes nothing and touches no production system: it runs the repository's
# own local checks. A check it did not run is reported SKIPPED, never PASS.
#
#   pwsh -File .claude/skills/tm-validation-battery/scripts/run-battery.ps1
#   ... -Only lint,tsc
#   ... -Skip harness,build
#
# Exit code: 0 when every check that ran matched its baseline, 1 otherwise.

param(
    [string[]] $Only,
    [string[]] $Skip,
    [string] $PgBin = '/c/Program Files/PostgreSQL/18/bin'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Off

# Invoked via -File, "-Only a,b" arrives as ONE string rather than an array, so
# every check would be filtered out and silently reported SKIPPED. Split first.
$Only = @($Only | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$Skip = @($Skip | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Baselines = Get-Content -LiteralPath (Join-Path $ScriptDir 'baselines.json') -Raw | ConvertFrom-Json

$Root = (& git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($Root)) {
    Write-Host 'Not inside a git checkout. Run this from the repository.'
    exit 1
}
$Root = ($Root -join "`n").Trim()

$OutDir = Join-Path ([System.IO.Path]::GetTempPath()) ('tm-battery-' + [System.Guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$Order = @('harness', 'test', 'tsc', 'lint', 'build', 'context', 'context-maintenance')
$Results = @()

function Should-Run {
    param([string] $Name)
    if ($Only -and ($Only -notcontains $Name)) { return $false }
    if ($Skip -and ($Skip -contains $Name)) { return $false }
    return $true
}

function Invoke-Check {
    # Runs one command line through cmd so native stderr is captured as plain text
    # rather than wrapped in PowerShell error records. Returns exit code + output.
    param([string] $Name, [string] $CommandLine)
    $log = Join-Path $OutDir ($Name + '.log')
    $previous = Get-Location
    Set-Location -LiteralPath $Root
    try {
        & cmd /c "$CommandLine > `"$log`" 2>&1"
        $code = $LASTEXITCODE
    } finally {
        Set-Location -LiteralPath $previous
    }
    $text = ''
    if (Test-Path -LiteralPath $log) { $text = [System.IO.File]::ReadAllText($log) }
    return [pscustomobject]@{ ExitCode = $code; Output = $text; Log = $log }
}

function Add-Result {
    param([string] $Name, [string] $Status, [string] $Detail, [string] $Log)
    $script:Results += [pscustomobject]@{
        Check = $Name; Status = $Status; Detail = $Detail; Log = $Log
    }
}

function Get-LintWarnings {
    # Signature per warning: path:line:col:rule. The rule is the final token on the
    # warning line; the file comes from the preceding "./path" header.
    param([string] $Text)
    $signatures = @()
    $current = $null
    foreach ($line in ($Text -split "`r?`n")) {
        $fileMatch = [regex]::Match($line, '^\./(.+)$')
        if ($fileMatch.Success) { $current = $fileMatch.Groups[1].Value.Trim(); continue }
        $warnMatch = [regex]::Match($line, '^\s*(\d+):(\d+)\s+Warning:\s+(.*)$')
        if ($warnMatch.Success -and $current) {
            $tokens = $warnMatch.Groups[3].Value.Trim() -split '\s+'
            $rule = $tokens[$tokens.Length - 1]
            $signatures += ('{0}:{1}:{2}:{3}' -f $current, $warnMatch.Groups[1].Value, $warnMatch.Groups[2].Value, $rule)
        }
    }
    return $signatures
}

Write-Host ''
Write-Host ('Baselines measured at commit {0} ({1}).' -f $Baselines.measuredAtCommit, $Baselines.measuredOn)
$head = (& git -C $Root rev-parse HEAD 2>$null)
if ($head) { Write-Host ('Current HEAD: {0}' -f ($head -join '').Trim()) }
Write-Host ('Logs: {0}' -f $OutDir)
Write-Host ''

foreach ($name in $Order) {
    if (-not (Should-Run $name)) {
        Add-Result $name 'SKIPPED' 'excluded by -Only/-Skip' ''
        continue
    }

    switch ($name) {

        'harness' {
            # Git Bash is often absent from the PowerShell host's PATH even when
            # it is installed, which silently skipped this check. Fall back to the
            # usual install locations before giving up.
            $bash = (Get-Command bash -ErrorAction SilentlyContinue)
            if (-not $bash) {
                foreach ($candidate in @(
                    (Join-Path $env:ProgramFiles 'Git\bin\bash.exe'),
                    (Join-Path ${env:ProgramFiles(x86)} 'Git\bin\bash.exe'),
                    (Join-Path $env:LOCALAPPDATA 'Programs\Git\bin\bash.exe')
                )) {
                    if ($candidate -and (Test-Path -LiteralPath $candidate)) { $bash = $candidate; break }
                }
            }
            if (-not $bash) {
                Add-Result $name 'SKIPPED' 'bash not found on PATH or in the usual Git install locations; the harness was NOT run' ''
                break
            }
            $pgProbe = $PgBin -replace '^/([a-zA-Z])/', '$1:/'
            if (-not (Test-Path -LiteralPath (Join-Path $pgProbe 'initdb.exe'))) {
                Add-Result $name 'SKIPPED' ("PostgreSQL binaries not found at $PgBin; the harness was NOT run") ''
                break
            }
            if ($bash -is [string]) { $bashExe = $bash } else { $bashExe = $bash.Source }
            Write-Host 'Running executable PostgreSQL harness...'
            $r = Invoke-Check $name ('set "PGBIN=' + $PgBin + '" & "' + $bashExe + '" supabase/tests/executable/run.sh')
            $marker = $Baselines.checks.harness.terminalMarker
            if ($r.ExitCode -eq $Baselines.checks.harness.exitCode -and $r.Output -match [regex]::Escape($marker)) {
                Add-Result $name 'PASS' ('exit 0; "' + $marker + '"') $r.Log
            } else {
                Add-Result $name 'FAIL' ("exit $($r.ExitCode); terminal marker not confirmed") $r.Log
            }
        }

        'test' {
            Write-Host 'Running vitest...'
            $r = Invoke-Check $name 'npm.cmd run test'
            $files = [regex]::Match($r.Output, 'Test Files\s+.*?\((\d+)\)')
            $tests = [regex]::Match($r.Output, '\bTests\s+.*?\((\d+)\)')
            $failed = [regex]::Match($r.Output, 'Tests\s+(\d+) failed')
            $fileCount = -1; $testCount = -1
            if ($files.Success) { $fileCount = [int] $files.Groups[1].Value }
            if ($tests.Success) { $testCount = [int] $tests.Groups[1].Value }
            $notes = @()
            if ($r.ExitCode -ne $Baselines.checks.test.exitCode) { $notes += "exit $($r.ExitCode)" }
            if ($failed.Success -and [int] $failed.Groups[1].Value -gt 0) { $notes += "$($failed.Groups[1].Value) failed" }
            if ($fileCount -ne $Baselines.checks.test.testFiles) { $notes += "test files $fileCount vs baseline $($Baselines.checks.test.testFiles)" }
            if ($testCount -ne $Baselines.checks.test.tests) { $notes += "tests $testCount vs baseline $($Baselines.checks.test.tests)" }
            if ($notes.Count -eq 0) {
                Add-Result $name 'PASS' ("$fileCount files / $testCount tests, matches baseline") $r.Log
            } else {
                Add-Result $name 'FAIL' ($notes -join '; ') $r.Log
            }
        }

        'tsc' {
            Write-Host 'Running tsc --noEmit...'
            $r = Invoke-Check $name 'npx tsc --noEmit'
            $errors = ([regex]::Matches($r.Output, 'error TS\d+')).Count
            if ($r.ExitCode -eq $Baselines.checks.tsc.exitCode -and $errors -eq $Baselines.checks.tsc.diagnostics) {
                Add-Result $name 'PASS' 'no diagnostics' $r.Log
            } else {
                Add-Result $name 'FAIL' ("exit $($r.ExitCode); $errors diagnostics vs baseline $($Baselines.checks.tsc.diagnostics)") $r.Log
            }
        }

        'lint' {
            Write-Host 'Running lint...'
            $r = Invoke-Check $name 'npm.cmd run lint'
            $found = @(Get-LintWarnings $r.Output)
            $expected = @($Baselines.checks.lint.warnings)
            $new = @($found | Where-Object { $expected -notcontains $_ })
            $gone = @($expected | Where-Object { $found -notcontains $_ })
            $notes = @()
            if ($r.ExitCode -ne $Baselines.checks.lint.exitCode) { $notes += "exit $($r.ExitCode)" }
            foreach ($w in $new) { $notes += "NEW warning $w" }
            foreach ($w in $gone) { $notes += "baseline warning no longer reported: $w" }
            if ($notes.Count -eq 0) {
                Add-Result $name 'PASS' ("$($found.Count) warnings, exactly the baseline set") $r.Log
            } else {
                Add-Result $name 'FAIL' ($notes -join '; ') $r.Log
            }
        }

        'build' {
            Write-Host 'Running build...'
            $r = Invoke-Check $name 'npm.cmd run build'
            if ($r.ExitCode -eq $Baselines.checks.build.exitCode) {
                Add-Result $name 'PASS' 'exit 0' $r.Log
            } else {
                $hint = ''
                if ($r.Output -match 'NEXT_PUBLIC_SUPABASE') { $hint = ' (missing local env file? verify before calling this a code regression)' }
                Add-Result $name 'FAIL' ("exit $($r.ExitCode)$hint") $r.Log
            }
        }

        'context' {
            Write-Host 'Running validate:claude-context...'
            $r = Invoke-Check $name 'npm.cmd run validate:claude-context'
            if ($r.ExitCode -eq $Baselines.checks.context.exitCode) {
                Add-Result $name 'PASS' 'exit 0' $r.Log
            } else {
                Add-Result $name 'FAIL' "exit $($r.ExitCode)" $r.Log
            }
        }

        'context-maintenance' {
            # A completion gate, not a state check: it compares the working tree
            # against HEAD, so on a clean tree it fails by design. Running it there
            # would report a failure that means nothing.
            $dirty = (& git -C $Root status --porcelain=v1 2>$null)
            if ([string]::IsNullOrWhiteSpace(($dirty -join ''))) {
                Add-Result $name 'SKIPPED' 'clean tree: this gate fails by design with no pending doc edits; run it once the edits exist and before the commit' ''
                break
            }
            Write-Host 'Running validate:claude-context --require-maintenance...'
            $r = Invoke-Check $name 'npm.cmd run validate:claude-context -- --require-maintenance'
            if ($r.ExitCode -eq 0) {
                Add-Result $name 'PASS' 'maintenance requirements satisfied by the pending change' $r.Log
            } else {
                Add-Result $name 'FAIL' "exit $($r.ExitCode) - see log for which requirement is unmet" $r.Log
            }
        }
    }
}

Write-Host ''
Write-Host 'Result'
Write-Host '------'
foreach ($row in $Results) {
    Write-Host ('{0,-20} {1,-8} {2}' -f $row.Check, $row.Status, $row.Detail)
}

$failed = @($Results | Where-Object { $_.Status -eq 'FAIL' })
$skipped = @($Results | Where-Object { $_.Status -eq 'SKIPPED' })
Write-Host ''
Write-Host ('{0} passed, {1} failed, {2} skipped (skipped is NOT passed - report each by name).' -f `
    (@($Results | Where-Object { $_.Status -eq 'PASS' })).Count, $failed.Count, $skipped.Count)

if ($failed.Count -gt 0) { exit 1 }
exit 0
