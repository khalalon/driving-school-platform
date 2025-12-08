# GitHub Actions Workflows

This directory contains all CI/CD workflows for the Driving School Platform.

## Workflows

### 1. CI/CD Pipeline (`ci-cd.yml`)
**Trigger:** Push to main/develop, Pull Requests

**Jobs:**
- Detect changes in services
- Run tests for each modified service
- Build and push Docker images
- Deploy to staging/production

**Features:**
- Smart change detection (only tests modified services)
- Parallel testing
- Code coverage upload
- Automated deployments

### 2. PR Checks (`pr-check.yml`)
**Trigger:** Pull Request opened/updated

**Validates:**
- PR title format (semantic)
- No merge conflicts
- No large files (>5MB)
- No secrets in code
- Commit message format

### 3. Dependency Update (`dependency-update.yml`)
**Trigger:** Weekly (Mondays) or manual

**Actions:**
- Updates all service dependencies
- Runs security audit
- Creates automated PRs

### 4. Security Scan (`security.yml`)
**Trigger:** Daily or on push to main/develop

**Scans:**
- npm dependencies (npm audit)
- Third-party vulnerabilities (Snyk)
- Docker images (Trivy)
- Code quality (CodeQL)

### 5. Release (`release.yml`)
**Trigger:** Git tag (v*)

**Actions:**
- Generates changelog
- Creates GitHub release
- Publishes Docker images to Docker Hub
- Multi-platform builds (amd64, arm64)

### 6. Performance Tests (`performance.yml`)
**Trigger:** Daily at 2 AM or manual

**Tests:**
- Load testing with k6
- Performance benchmarks
- Response time tracking

### 7. E2E Tests (`e2e.yml`)
**Trigger:** Daily at 4 AM or manual

**Tests:**
- Full integration tests
- API endpoint validation
- Service communication tests

## Required Secrets

Configure these in GitHub Settings → Secrets:
```
GITHUB_TOKEN         - Automatically provided
DOCKERHUB_USERNAME   - Docker Hub username
DOCKERHUB_TOKEN      - Docker Hub access token
SNYK_TOKEN          - Snyk API token (optional)
```

## Branch Strategy
```
main (production)
  ↑
develop (staging)
  ↑
feature/* (development)
```

## Deployment Flow

1. **Feature branches** → Create PR to `develop`
2. **PR merged** → Auto-deploy to staging
3. **develop merged to main** → Auto-deploy to production

## Usage Examples

### Trigger Manual Workflow
```bash
# Via GitHub CLI
gh workflow run ci-cd.yml

# Via GitHub UI
Actions → Select workflow → Run workflow
```

### Create Release
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### Check Workflow Status
```bash
gh run list
gh run view <run-id>
```

## Best Practices

1. **Keep workflows DRY** - Use reusable workflows
2. **Fail fast** - Stop on first error
3. **Cache dependencies** - Speed up builds
4. **Matrix builds** - Test multiple versions
5. **Security first** - Scan regularly

## Monitoring

- **Build Status**: Check Actions tab
- **Coverage**: View in PR comments
- **Performance**: Review artifacts
- **Security**: Check Security tab

## Troubleshooting

### Tests Failing
1. Check service logs
2. Verify environment variables
3. Check database migrations

### Docker Build Issues
1. Clear cache: Re-run with no cache
2. Check Dockerfile syntax
3. Verify base images

### Deployment Failures
1. Check credentials
2. Verify network connectivity
3. Review deployment logs
