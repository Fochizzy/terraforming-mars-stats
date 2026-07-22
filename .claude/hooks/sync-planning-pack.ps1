# Post-commit / post-merge planning-pack synchronization hook.
#
# Registered as a PostToolUse / Bash hook in .claude/settings.json via two
# handlers in the same matcher group: one gated on `Bash(git commit *)` and one
# on `Bash(git merge *)`, disambiguated by `-Trigger commit` / `-Trigger merge`.
# A merge creates a commit WITHOUT invoking `git commit`, so it needs its own
# trigger; distinct args also keep hook deduplication (by command + args) from
# collapsing the two handlers. The hook automates CLAUDE.md workflow step 8
# ("after the commit, run the planning-pack updater") so synchronization no
# longer depends on an agent remembering to run it.
#
# Contract (see docs/agent-handoffs/PLANNING-PACK-POST-COMMIT-SYNC-HOOK.md and
# the DECISIONS.md entry "Project-wide - post-commit planning-pack
# synchronization is hook-enforced"):
#
#   * Inert in any checkout that is not the redesign repository.
#   * No-op when HEAD did not advance (failed commit/merge, no-op turn, repeat
#     fire).
#   * Tree-identity gate. The installed updater resolves every source under a
#     FIXED root (its `ROOT` in update_planning_pack.py) — one specific worktree.
#     If this hook fired in any OTHER tree, the updater would read a tree that
#     does NOT contain the just-made commit, "succeed", and let the hook falsely
#     record a sync. So the hook runs the updater only when the current tree IS
#     the updater's tree (that root is read at runtime, not hard-coded here).
#     Otherwise it reports synchronization PENDING (naming the worktree and the
#     SHA) and does NOT advance the marker: silence is safer than false success.
#   * Runs the updater only when a planning-pack SOURCE changed between the
#     last recorded sync and HEAD. The watched source set is DERIVED at runtime
#     from docs/redesign/CLAUDE-PROJECT-SOURCES.json (plus the agent-handoffs
#     directory). No document filename is hard-coded here.
#   * When the sync marker is absent or unresolvable there is no trustworthy
#     comparison base: a single merge can land many commits, so a HEAD~1 base
#     would undercount the changed set and could miss a pack-relevant file. In
#     that case the change is treated as pack-relevant and synchronized.
#   * A missing updater reports "pending" and does NOT advance the sync marker.
#   * Always exits 0. Never exits 2. The updater owns its own concurrency lock.
#
# This hook does not authorize any deploy, migration, or production write; it
# only triggers the same local, authorized planning-pack updater the documented
# gate already requires.

param(
    # Which git operation fired this hook, passed from settings.json. The two
    # handlers (commit and merge) carry distinct args so hook deduplication
    # cannot collapse them, and the value lets emitted messages name the
    # operation. Defaults to 'commit' for backward compatibility.
    [string] $Trigger = 'commit'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Off

$TriggerWord = if ($Trigger -eq 'merge') { 'merge' } else { 'commit' }

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

function Get-NormalizedPath {
    # Canonicalize a path for identity comparison: absolute form, no trailing
    # separator, lower-cased (Windows paths are case-insensitive). Returns $null
    # when the input is blank or cannot be resolved.
    param([string] $Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $null }
    try {
        $full = [System.IO.Path]::GetFullPath($Path.Trim())
    } catch {
        return $null
    }
    return ($full.TrimEnd('\', '/')).ToLowerInvariant()
}

function Get-UpdaterRoot {
    # The installed updater resolves every planning-pack source under a FIXED
    # root, hard-coded as `ROOT = Path(r"...")` in update_planning_pack.py. Read
    # that root at runtime so the hook can compare it against the current tree,
    # instead of committing a machine-specific absolute path into this file. The
    # updater lives under %LOCALAPPDATA%\TMPlanningPackUpdater by install
    # convention (the same tree the Desktop .bat -> run-updater.bat chain runs).
    # Returns the raw root string, or $null if it cannot be determined.
    $localAppData = $env:LOCALAPPDATA
    if ([string]::IsNullOrWhiteSpace($localAppData)) { return $null }
    $updaterPy = Join-Path $localAppData 'TMPlanningPackUpdater\update_planning_pack.py'
    if (-not (Test-Path -LiteralPath $updaterPy)) { return $null }
    try {
        $text = [System.IO.File]::ReadAllText($updaterPy)
    } catch {
        return $null
    }
    # Match the single top-level assignment `ROOT = Path(r"<path>")`. Other
    # Path(...) assignments (APP_DIR, DEFAULT_SOURCE_MANIFEST) and the git
    # repository literal inside REQUIRED_GIT_SOURCES do not start a line with
    # `ROOT =`, so this stays specific to the updater's working-tree root.
    $match = [regex]::Match($text, '(?m)^\s*ROOT\s*=\s*Path\(\s*r?["'']([^"'']+)["'']\s*\)')
    if (-not $match.Success) { return $null }
    $value = $match.Groups[1].Value.Trim()
    if ([string]::IsNullOrWhiteSpace($value)) { return $null }
    return $value
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

    $shortHead = $head.Substring(0, [Math]::Min(12, $head.Length))

    # --- (d2) Tree-identity gate --------------------------------------------
    # The updater reads a FIXED root (its `ROOT` in update_planning_pack.py):
    # one specific worktree. If this hook fired in any other tree, invoking the
    # updater would read a tree that does NOT contain this commit, report
    # success, and let the hook falsely record a sync and claim Drive is
    # current. So only run the updater when the current tree IS the updater's
    # tree. Otherwise report PENDING and leave the marker untouched.
    $updaterRoot = Get-UpdaterRoot
    if (-not $updaterRoot) {
        Emit-SystemMessage "Planning-pack synchronization PENDING: could not determine which tree the planning-pack updater reads (update_planning_pack.py was not found under %LOCALAPPDATA%\TMPlanningPackUpdater, or its ROOT was unreadable). This git $TriggerWord (HEAD $shortHead) in worktree '$Root' was NOT synchronized and .claude/.pack-last-sync was NOT advanced, so Google Drive is NOT current for this change. Run the updater manually."
        exit 0
    }
    $normalizedRoot = Get-NormalizedPath $Root
    $normalizedUpdaterRoot = Get-NormalizedPath $updaterRoot
    if ((-not $normalizedRoot) -or (-not $normalizedUpdaterRoot) -or ($normalizedRoot -ne $normalizedUpdaterRoot)) {
        Emit-SystemMessage "Planning-pack synchronization PENDING: this git $TriggerWord (HEAD $shortHead) was made in worktree '$Root', which is NOT the tree the planning-pack updater reads ('$updaterRoot'). The updater was NOT run and .claude/.pack-last-sync was NOT advanced, so Google Drive is NOT current for this change. Merge into the updater's tree (or run the updater there) to synchronize."
        exit 0
    }

    # --- (e) Comparison base and changed-file set ---------------------------
    # Only a resolvable recorded sync SHA is a trustworthy base. When the marker
    # is absent or unresolvable there is no reliable comparison point: a single
    # merge can land many commits at once, so falling back to HEAD~1 would
    # undercount the changed set and could miss a pack-relevant file. Fail open
    # toward publishing instead of guessing a base.
    $base = $null
    if ($lastSync) {
        $resolved = Invoke-Git @('rev-parse', '--verify', '--quiet', ($lastSync + '^{commit}'))
        if ($resolved) { $base = $resolved.Trim() }
    }

    $packRelevant = $false
    $changedFiles = @()
    if (-not $base) {
        # Absent, unresolvable, or otherwise unavailable base (including a root
        # commit): treat the change as pack-relevant and synchronize rather than
        # trusting an undercounting HEAD~1 base.
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
        Emit-SystemMessage "Planning-pack synchronization pending: the local updater '$bat' is unavailable. HEAD $shortHead (git $TriggerWord) is NOT recorded as synced. Run the updater manually or report synchronization pending."
        exit 0
    }

    $null = & $bat *>&1
    $updaterCode = $LASTEXITCODE

    if ($updaterCode -eq 0) {
        # --- (i) success: advance the sync marker --------------------------
        try { [System.IO.File]::WriteAllText($syncFile, $head) } catch { }
        Emit-SystemMessage "Planning-pack updater ran for HEAD $shortHead (git $TriggerWord). Verify the Drive result in the updater's local log."
        exit 0
    }

    # --- (i) failure: leave the marker unchanged -----------------------------
    Emit-SystemMessage "Planning-pack updater FAILED with exit code $updaterCode. Synchronization is pending and HEAD $shortHead (git $TriggerWord) is NOT recorded as synced. See the updater's local log."
    exit 0
} catch {
    # Any unexpected error must never block the commit flow.
    Emit-SystemMessage "Planning-pack sync hook encountered an unexpected error and took no action: $($_.Exception.Message)"
    exit 0
}
