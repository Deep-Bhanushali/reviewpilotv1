# GitHub Setup Guide

This guide will help you push your Online Reviewer System code to GitHub.

## Prerequisites

✅ GitHub connection is already set up in Replit  
✅ `.gitignore` file is configured to exclude sensitive files

---

## Option 1: Use Replit's Built-in Git Integration (Recommended)

Replit has a built-in Version Control tool that makes it easy to push your code to GitHub.

### Step 1: Open Version Control Panel
1. Look for the **Git icon** (branch icon) in the left sidebar of Replit
2. Click on it to open the Version Control panel

### Step 2: Create or Connect to GitHub Repository

**If you don't have a repository yet:**
1. In the Version Control panel, click **"Create a Git Repo"**
2. Choose **"Create new repository on GitHub"**
3. Enter repository details:
   - **Name**: `online-reviewer-system` (or your preferred name)
   - **Description**: `Online Reviewer System - Manage review-based earnings with smart notifications and calendar integration`
   - **Visibility**: Choose Public or Private
4. Click **"Create Repository"**

**If you already have a repository:**
1. Click **"Create a Git Repo"**
2. Choose **"Import from GitHub"**
3. Select your existing repository from the list

### Step 3: Commit and Push Your Code
1. In the Version Control panel, you'll see all your files listed
2. Review the changes (all files should be marked as new additions)
3. Enter a commit message, for example:
   ```
   Initial commit: Online Reviewer System with all features
   
   - Order management with 8-stage lifecycle
   - Smart notifications system
   - Activity log with complete audit trail
   - Google Calendar integration
   - Mediator and account management
   - Data import/export functionality
   - Mobile-first responsive design
   ```
4. Click **"Commit & Push"**

Your code is now on GitHub! 🎉

---

## Option 2: Use the GitHub Helper Script

We've created a helper script that uses the GitHub API to manage repositories.

### Check Your GitHub Connection

```bash
tsx scripts/github-helper.ts user
```

This will show your GitHub username and confirm the connection is working.

### List Your Existing Repositories

```bash
tsx scripts/github-helper.ts list
```

This shows your 10 most recently updated repositories.

### Create a New Repository

```bash
tsx scripts/github-helper.ts create "online-reviewer-system" "Online Reviewer System - Manage review-based earnings" false
```

Parameters:
- **Name**: `online-reviewer-system` (must be unique in your GitHub account)
- **Description**: Your repository description
- **Private**: `false` for public, `true` for private

The script will output the repository URLs you'll need for pushing.

### After Creating the Repository

Once you have the repository URL, you'll still need to use Replit's Version Control panel (Option 1) to connect and push your code, or use the Replit Shell if you have git expertise.

---

## Option 3: Manual Git Commands (Advanced Users Only)

⚠️ **Note**: Replit restricts direct git operations for security. This option requires proper git expertise and may not work in all environments.

If you have git expertise and want to use manual commands:

### 1. Check Git Status
```bash
git status
```

### 2. Add All Files
```bash
git add .
```

### 3. Create Initial Commit
```bash
git commit -m "Initial commit: Online Reviewer System"
```

### 4. Add GitHub Remote
Replace `USERNAME` and `REPO_NAME` with your actual values:
```bash
git remote add origin https://github.com/USERNAME/REPO_NAME.git
```

### 5. Push to GitHub
```bash
git push -u origin main
```

If you encounter authentication issues, you may need to use a Personal Access Token instead of your password.

---

## What Gets Pushed to GitHub?

Your `.gitignore` file is configured to exclude:

### ❌ Excluded (NOT pushed):
- `node_modules/` - Dependencies (installed via npm)
- `dist/` - Build outputs
- `.env` files - Environment variables and secrets
- Database files (`.db`, `.sqlite`)
- Log files
- Temporary files
- IDE settings (`.vscode`, `.idea`)

### ✅ Included (WILL be pushed):
- All source code (`client/`, `server/`, `shared/`)
- Configuration files (`package.json`, `tsconfig.json`, etc.)
- Database schema (`shared/schema.ts`)
- Documentation (`README.md`, `PRODUCT_REQUIREMENTS.md`, etc.)
- Public assets

---

## After Pushing to GitHub

### View Your Repository
Visit: `https://github.com/YOUR_USERNAME/online-reviewer-system`

### Clone to Another Machine
```bash
git clone https://github.com/YOUR_USERNAME/online-reviewer-system.git
cd online-reviewer-system
npm install
```

### Set Up Environment Variables
Create a `.env` file with:
```
DATABASE_URL=your_postgres_connection_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Run the Application
```bash
npm run dev
```

---

## Troubleshooting

### "Repository already exists"
- If you see this error when creating a repo, either:
  - Use a different name
  - Delete the existing repo from GitHub first
  - Connect to the existing repo instead

### "Permission denied"
- Make sure the GitHub connection in Replit is active
- Try disconnecting and reconnecting the GitHub integration
- Check that you have write access to the repository

### "Cannot access .git directory"
- This is expected on Replit for security reasons
- Use Option 1 (Replit's Version Control panel) instead

### Need to Update Your Code Later?
1. Make your changes in Replit
2. Go to Version Control panel
3. Review changed files
4. Add a descriptive commit message
5. Click "Commit & Push"

---

## Best Practices

### Commit Messages
Write clear, descriptive commit messages:
- ✅ Good: `Add WhatsApp integration for mediator messaging`
- ✅ Good: `Fix calendar sync duplicate event bug`
- ❌ Bad: `Update files`
- ❌ Bad: `Changes`

### Commit Frequency
- Commit after completing a feature
- Commit before making major changes
- Don't commit broken code

### Branch Strategy (Advanced)
Consider using branches for larger features:
```bash
git checkout -b feature/whatsapp-integration
# Make changes
git commit -m "Add WhatsApp integration"
git push origin feature/whatsapp-integration
# Create Pull Request on GitHub
```

---

## Next Steps

After pushing your code to GitHub:

1. **Add a README**: Create a README.md with:
   - Project description
   - Installation instructions
   - Usage guide
   - Screenshots

2. **Set up GitHub Actions**: Automate testing and deployment

3. **Add a License**: Choose an appropriate open-source license

4. **Enable GitHub Pages**: Host documentation

5. **Invite Collaborators**: Share your repo with team members

---

## Quick Reference

```bash
# Check connection
tsx scripts/github-helper.ts user

# List repositories
tsx scripts/github-helper.ts list

# Create new repository
tsx scripts/github-helper.ts create "repo-name" "Description" false
```

**Recommended**: Use Replit's Version Control panel (Git icon in left sidebar) for the easiest experience!
