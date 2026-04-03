param(
    [ValidateSet("ssh", "ssh-batch", "troubleshoot", "describe")]
    [string]$Action = "ssh",
    [string]$Instance = "minhlakiet-20251229-065339",
    [string]$Zone = "us-central1-c",
    [string]$Project = "bdien-muonmay",
    [string]$RemoteCommand = "echo CONNECTED && hostname && whoami",
    [switch]$NoIap
)

$ErrorActionPreference = "Stop"

function Invoke-Gcloud {
    param([string[]]$Args)
    Write-Host ("gcloud " + ($Args -join " ")) -ForegroundColor Cyan
    & gcloud @Args
}

Invoke-Gcloud @("config", "set", "project", $Project)

switch ($Action) {
    "describe" {
        Invoke-Gcloud @(
            "compute", "instances", "describe", $Instance,
            "--zone", $Zone,
            "--project", $Project,
            "--format", "value(name,status,zone,networkInterfaces[0].networkIP)"
        )
    }

    "troubleshoot" {
        $args = @(
            "compute", "ssh", $Instance,
            "--zone", $Zone,
            "--project", $Project,
            "--troubleshoot"
        )
        if (-not $NoIap) {
            $args += "--tunnel-through-iap"
        }
        Invoke-Gcloud $args
    }

    "ssh-batch" {
        $args = @(
            "compute", "ssh", $Instance,
            "--zone", $Zone,
            "--project", $Project,
            "--ssh-flag=-batch",
            "--command", $RemoteCommand
        )
        if (-not $NoIap) {
            $args += "--tunnel-through-iap"
        }
        Invoke-Gcloud $args
    }

    default {
        $args = @(
            "compute", "ssh", $Instance,
            "--zone", $Zone,
            "--project", $Project
        )
        if (-not $NoIap) {
            $args += "--tunnel-through-iap"
        }
        Invoke-Gcloud $args
    }
}
