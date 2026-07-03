# View Docker logs script
# PowerShell version

param(
    [string]$ServiceName
)

# Follow logs for all services or specific service
if ([string]::IsNullOrEmpty($ServiceName)) {
    docker compose logs -f --tail=100
} else {
    docker compose logs -f --tail=100 $ServiceName
}
