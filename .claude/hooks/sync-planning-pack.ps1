# Post-commit planning-pack synchronization hook.
#
# Registered as a PostToolUse / Bash hook gated on `Bash(git commit *)` in
# .claude/settings.json. It automates CLAUDE.md workflow step 8 ("after the
# commit, run the planning-pack updater") so synchronization no longer depends
# on an agent remembering to run it.
#
# Contract (see docs/agent-handoffs/PLANNING-PACK-POST-COMMIT-SYNC-HOOK.md and
# the DECISIONS.md entry "Project-wide - post-commit planning-pack
# synchronization is hook-enforced"):
#
#   * Inert in any checkout that is not the redesign repository.
#   * No-op when HEAD did not advance (failed commit, no-op turn, repeat fire).
#   * Runs the updater only when a planning-pack SOURCE changed between the
#     last recorded sync and HEAD. The watched source set is DERIVED at runtime
#     from docs/redesign/CLAUDE-PROJECT-SOURCES.json (plus the agent-handoffs
#     directory). No document filename is hard-coded here.
#   * A missing updater reports "pending" and does NOT advance the sync marker.
#   * Always exits 0. Never exits 2. The updater owns its own concurrency lock.
#
# This hook does not authorize any deploy, migration, or production write; it
# only triggers the same local, authorized planning-pack updater the documented
# gate already requires.

$ErrorActionPreference = 'Stop'
Set-StrictMode -Off

$SyncRelativePath = '.claude/.pack-last-sync'
$CatalogRelativePath = 'docs/redesign/CLAUDE-PROJECT-SOURCES.json'
$HandoffPrefix = 'docs/agent-handoffs/'
$RepoSlug = 'terraforming-mars-stats'

function Emit-SystemMessage {
    param([string] $Message)
    # Surface a transient message to the user via the hook JSON contract.
    # Kept off every other stream so stdout carries only this JSON object.
    try {
        Write-Output (@{ systemMessage = $Message } | ConvertTo-Json -Compress)
    } catch {
        # Never let reporting failure turn into a blocking (exit 2) hook.
    }
}

function Convert-ToRelative {
    param([string] $Value)
    if ($null -eq $Value) { return '' }
    return ($Value -replace '\\', '/').Trim()
}

function Invoke-Git {
    # Runs git in $Root and returns trimmed stdout, or $null on any failure.
    param([string[]] $GitArgs)
    try {
        $output = & git -C $Root @GitArgs 2>$null
        if ($LASTEXITCODE -ne 0) { return $null }
        if ($null -eq $output) { return '' }
        return ($output -join "`n")
    } catch {
        return $null
    }
}

try {
    # --- (a) Resolve and validate the repository identity -------------------
    $projectDir = $env:CLAUDE_PROJECT_DIR
    if ([string]::IsNullOrWhiteSpace($projectDir) -or -not (Test-Path -LiteralPath $projectDir)) {
        exit 0
    }

    $topLevel = $null
    try {
        $topLevel = & git -C $projectDir rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -ne 0) { $topLevel = $null }
    } catch {
        $topLevel = $null
    }
    if ([string]::IsNullOrWhiteSpace($topLevel)) { exit 0 }
    $Root = ($topLevel -join "`n").Trim()

    # The planning-pack catalog is a redesign-repository-specific marker. Its
    # absence means this is not the redesign checkout, so the hook stays inert.
    $catalogPath = Join-Path $Root $CatalogRelativePath
    if (-not (Test-Path -LiteralPath $catalogPath)) { exit 0 }

    # Defence in depth: if the origin remote is readable and is clearly a
    # different project, stay inert. A missing/unreadable remote does not
    # disable enforcement (isolated worktrees still share the origin).
    try {
        $remoteUrl = & git -C $Root remote get-url origin 2>$null
        if ($LASTEXITCODE -eq 0 -and $remoteUrl) {
            $remoteUrl = ($remoteUrl -join "`n").Trim()
            if ($remoteUrl -and ($remoteUrl -notlike "*$RepoSlug*")) { exit 0 }
        }
    } catch {
        # Remote unreadable: fall through on the catalog signal alone.
    }

    # --- (b) Current HEAD ---------------------------------------------------
    $head = Invoke-Git @('rev-parse', 'HEAD')
    if ([string]::IsNullOrWhiteSpace($head)) { exit 0 }
    $head = $head.Trim()

    # --- (c) Last-synced SHA ------------------------------------------------
    $syncFile = Join-Path $Root $SyncRelativePath
    $lastSync = $null
    if (Test-Path -LiteralPath $syncFile) {
        try {
            $raw = [System.IO.File]::ReadAllText($syncFile)
            if ($raw) {
                $token = ($raw -split '\s+') | Where-Object { $_ } | Select-Object -First 1
                if ($token) { $lastSync = $token.Trim() }
            }
        } catch {
            $lastSync = $null
        }
    }

    # --- (d) No-op when HEAD did not advance --------------------------------
    # Covers a failed commit, a no-op turn, and a repeated fire.
    if ($lastSync -and ($lastSync -eq $head)) { exit 0 }

    # --- (e) Comparison base and changed-file set ---------------------------
    # A resolvable recorded SHA is the base; otherwise the previous commit.
    $base = $null
    if ($lastSync) {
        $resolved = Invoke-Git @('rev-parse', '--verify', '--quiet', ($lastSync + '^{commit}'))
        if ($resolved) { $base = $resolved.Trim() }
    }
    if (-not $base) {
        $parent = Invoke-Git @('rev-parse', '--verify', '--quiet', 'HEAD^{commit}~1')
        if ($parent) { $base = $parent.Trim() }
    }

    $packRelevant = $false
    $changedFiles = @()
    if (-not $base) {
        # No comparison point (e.g. root commit): fail open and synchronize.
        $packRelevant = $true
    } else {
        $diff = Invoke-Git @('diff', '--name-only', $base, $head)
        if ($null -eq $diff) {
            # Could not compute a diff: fail open rather than skip silently.
            $packRelevant = $true
        } else {
            $changedFiles = @($diff -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        }
    }

    # --- (f) Derive the planning-pack watch set from the catalog ------------
    if (-not $packRelevant) {
        $watchPaths = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
        $phaseDir = $null
        $phaseFirst = $null
        $phaseLast = $null
        $catalogUsable = $true

        try {
            $catalog = Get-Content -LiteralPath $catalogPath -Raw -ErrorAction Stop | ConvertFrom-Json
        } catch {
            $catalog = $null
            $catalogUsable = $false
        }

        if (-not $catalogUsable -or $null -eq $catalog) {
            # Catalog unreadable or unparseable: treat as pack-relevant and
            # proceed rather than silently skipping a real sync.
            $packRelevant = $true
        } else {
            foreach ($doc in @($catalog.documents)) {
                if ($null -ne $doc -and $doc.PSObject.Properties['path'] -and $doc.path) {
                    [void] $watchPaths.Add((Convert-ToRelative $doc.path))
                }
            }
            $pd = $catalog.phaseDocuments
            if ($null -ne $pd -and $pd.PSObject.Properties['directory'] -and $pd.directory) {
                $phaseDir = Convert-ToRelative $pd.directory
                try { $phaseFirst = [int] $pd.first } catch { $phaseFirst = $null }
                try { $phaseLast = [int] $pd.last } catch { $phaseLast = $null }
            }

            foreach ($file in $changedFiles) {
                $nf = Convert-ToRelative $file
                if ($watchPaths.Contains($nf)) { $packRelevant = $true; break }
                if ($nf.ToLowerInvariant().StartsWith($HandoffPrefix)) { $packRelevant = $true; break }
                if ($phaseDir -and $nf.ToLowerInvariant().StartsWith(($phaseDir.ToLowerInvariant() + '/'))) {
                    $leaf = ($nf -split '/')[-1]
                    $m = [regex]::Match($leaf, '^(\d{2})-.*\.md$')
                    if ($m.Success) {
                        $num = [int] $m.Groups[1].Value
                        if (($null -eq $phaseFirst -or $num -ge $phaseFirst) -and ($null -eq $phaseLast -or $num -le $phaseLast)) {
                            $packRelevant = $true; break
                        }
                    }
                }
            }
        }
    }

    # --- (g) No pack-relevant change: record HEAD and stop ------------------
    if (-not $packRelevant) {
        try { [System.IO.File]::WriteAllText($syncFile, $head) } catch { }
        exit 0
    }

    # --- (h) Invoke the updater, or report pending if unavailable -----------
    $bat = Join-Path $env:USERPROFILE 'Desktop\Refresh TM Project Planning Pack.bat'
    if (-not (Test-Path -LiteralPath $bat)) {
        Emit-SystemMessage "Planning-pack synchronization pending: the local updater '$bat' is unavailable. HEAD $($head.Substring(0,[Math]::Min(12,$head.Length))) is NOT recorded as synced. Run the updater manually or report synchronization pending."
        exit 0
    }

    $null = & $bat *>&1
    $updaterCode = $LASTEXITCODE

    if ($updaterCode -eq 0) {
        # --- (i) success: advance the sync marker --------------------------
        try { [System.IO.File]::WriteAllText($syncFile, $head) } catch { }
        Emit-SystemMessage "Planning-pack updater ran for HEAD $($head.Substring(0,[Math]::Min(12,$head.Length))). Verify the Drive result in the updater's local log."
        exit 0
    }

    # --- (i) failure: leave the marker unchanged -----------------------------
    Emit-SystemMessage "Planning-pack updater FAILED with exit code $updaterCode. Synchronization is pending and HEAD $($head.Substring(0,[Math]::Min(12,$head.Length))) is NOT recorded as synced. See the updater's local log."
    exit 0
} catch {
    # Any unexpected error must never block the commit flow.
    Emit-SystemMessage "Planning-pack sync hook encountered an unexpected error and took no action: $($_.Exception.Message)"
    exit 0
}
