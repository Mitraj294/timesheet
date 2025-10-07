# GitHub Secret Scanning - Resolution Guide

**Repository:** Mitraj294/timesheet  
**Date:** October 7, 2025  
**Status:** 5 Open Alerts - MongoDB Credentials Exposed

---

## 🚨 CURRENT STATUS

### GitHub Secret Scanning Alerts (5 Open):
1. **server/.env.example:13** - MongoDB Atlas Database URI with credentials
2. **server/.env.development:5** - MongoDB Atlas Database URI with credentials  
3. **server/.env.staging:5** - MongoDB Atlas Database URI with credentials
4. **server/.env.production:6** - MongoDB Atlas Database URI with credentials
5. **server/.env.e2e1** - MongoDB Atlas Database URI with credentials (older file)

**Root Cause:** These files with real credentials were committed to Git history. Even though they've been removed from tracking, they remain in past commits.

---

## ✅ ACTIONS COMPLETED

1. ✅ Changed MongoDB password (old password `meet123` is no longer valid)
2. ✅ Added sensitive files to `.gitignore`
3. ✅ Removed files from Git tracking (local files preserved)
4. ✅ Configured SonarQube to exclude sensitive files from analysis

---

## 🔧 REQUIRED: CLEAN GIT HISTORY

You **must** remove these files from Git history to close the GitHub alerts. Choose one method:

### Method 1: BFG Repo-Cleaner (Recommended - Fast & Safe)

```bash
# 1. Backup your repository first
cp -r /home/digilab/timesheet /home/digilab/timesheet-backup

# 2. Download BFG (if not installed)
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar -O ~/bfg.jar

# 3. Clean the repository
cd /home/digilab/timesheet

# Remove all .env files from history
java -jar ~/bfg.jar --delete-files ".env.*" .git

# Remove SSL certificates from history
java -jar ~/bfg.jar --delete-files "key.pem" .git
java -jar ~/bfg.jar --delete-files "cert.pem" .git

# 4. Clean up and garbage collect
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Force push (WARNING: Rewrites history)
git push origin --force --all
git push origin --force --tags
```

### Method 2: git filter-repo (Modern Alternative)

```bash
# 1. Install git-filter-repo
pip3 install git-filter-repo

# 2. Backup first
cp -r /home/digilab/timesheet /home/digilab/timesheet-backup

# 3. Remove files from history
cd /home/digilab/timesheet

git filter-repo --invert-paths \
  --path server/.env.development \
  --path server/.env.staging \
  --path server/.env.production \
  --path server/.env.test \
  --path server/.env.e2e \
  --path server/.env.example \
  --path client/.env.test \
  --path key.pem \
  --path cert.pem \
  --force

# 4. Add back your remote (filter-repo removes it)
git remote add origin git@github.com:Mitraj294/timesheet.git

# 5. Force push
git push origin --force --all
git push origin --force --tags
```

### Method 3: Manual git filter-branch (Legacy)

```bash
# 1. Backup
cp -r /home/digilab/timesheet /home/digilab/timesheet-backup

# 2. Remove files from history
cd /home/digilab/timesheet

git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch \
    server/.env.* \
    client/.env.test \
    key.pem \
    cert.pem" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 4. Force push
git push origin --force --all
git push origin --force --tags
```

---

## ⚠️ IMPORTANT WARNINGS

### Before Force Pushing:

1. **Notify Team Members:** If others are working on this repo, coordinate with them first
2. **Backup Everything:** Make sure you have a complete backup
3. **Test Locally:** Verify the app still works after cleaning
4. **Check Branches:** This will rewrite ALL branches
5. **Deployment Impact:** Your production deployment may need reconfiguring

### After Force Push:

Team members need to run:
```bash
git fetch origin
git reset --hard origin/main
# Or delete and re-clone the repository
```

---

## 🔄 ALTERNATIVE: Make Repository Private

If you cannot clean Git history immediately:

1. Go to GitHub: https://github.com/Mitraj294/timesheet/settings
2. Scroll to "Danger Zone"
3. Click "Change visibility" → "Make private"
4. This limits exposure while you prepare history cleanup

**Note:** This doesn't fix the problem, only reduces risk.

---

## 📋 VERIFICATION CHECKLIST

After cleaning Git history:

- [ ] Force pushed to GitHub successfully
- [ ] Team members have updated their local repos
- [ ] App still works locally after history cleanup
- [ ] Production deployment still works
- [ ] GitHub secret scanning alerts automatically closed (may take 24-48 hours)
- [ ] No sensitive data in `git log --all --full-history`

### Check if secrets are gone:

```bash
# Search for old password in history
git log --all --full-history -S "meet123"

# Should return no results if successful
```

---

## 🛡️ PREVENT FUTURE INCIDENTS

1. **Pre-commit Hooks:** Install git-secrets
   ```bash
   brew install git-secrets  # macOS
   # or
   sudo apt-get install git-secrets  # Ubuntu
   
   cd /home/digilab/timesheet
   git secrets --install
   git secrets --register-aws
   git secrets --add 'mongodb\+srv://[^:]+:[^@]+'
   ```

2. **Use Environment Variable Templates:**
   - Create `.env.example` with placeholder values
   - Add `.env` pattern to `.gitignore` ✅ (Already done)
   - Document required variables in README

3. **Regular Audits:**
   - Run `git secrets --scan-history` monthly
   - Enable GitHub secret scanning (already enabled)
   - Review commits before pushing

4. **Secrets Management:**
   - **Render:** Use environment variables (not files)
   - **Local Dev:** Use `.env` files (never commit)
   - **Team Sharing:** Use 1Password/Bitwarden vaults

---

## 📞 NEED HELP?

**GitHub Support:** https://support.github.com/  
**BFG Documentation:** https://rtyley.github.io/bfg-repo-cleaner/  
**git-filter-repo:** https://github.com/newren/git-filter-repo

---

## ⏱️ TIMELINE ESTIMATE

- **BFG Method:** 5-10 minutes
- **filter-repo Method:** 10-15 minutes  
- **filter-branch Method:** 15-30 minutes
- **Alert Resolution:** 24-48 hours after force push

---

**CRITICAL:** Do this cleanup ASAP. Every day these credentials remain in Git history increases security risk.

**Last Updated:** October 7, 2025
