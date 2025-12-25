import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function createRepository(name: string, description: string, isPrivate: boolean = false) {
  const octokit = await getGitHubClient();
  
  try {
    const response = await octokit.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: false
    });
    
    console.log('\n✅ Repository created successfully!');
    console.log(`📦 Name: ${response.data.name}`);
    console.log(`🔗 URL: ${response.data.html_url}`);
    console.log(`📋 Clone URL: ${response.data.clone_url}`);
    console.log(`🔐 SSH URL: ${response.data.ssh_url}`);
    
    return response.data;
  } catch (error: any) {
    if (error.status === 422) {
      console.error('❌ Repository already exists or name is invalid');
    } else {
      console.error('❌ Error creating repository:', error.message);
    }
    throw error;
  }
}

async function listRepositories() {
  const octokit = await getGitHubClient();
  
  try {
    const response = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 10
    });
    
    console.log('\n📚 Your recent repositories:');
    response.data.forEach((repo, index) => {
      console.log(`${index + 1}. ${repo.name} - ${repo.html_url}`);
    });
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Error listing repositories:', error.message);
    throw error;
  }
}

async function getAuthenticatedUser() {
  const octokit = await getGitHubClient();
  
  try {
    const response = await octokit.users.getAuthenticated();
    console.log('\n👤 GitHub User:', response.data.login);
    console.log(`📧 Email: ${response.data.email || 'Not public'}`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error getting user info:', error.message);
    throw error;
  }
}

// Main execution
const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case 'create':
        const repoName = process.argv[3] || 'online-reviewer-system';
        const description = process.argv[4] || 'Online Reviewer System - Manage review-based earnings with smart notifications and calendar integration';
        const isPrivate = process.argv[5] === 'true';
        await createRepository(repoName, description, isPrivate);
        break;
      
      case 'list':
        await listRepositories();
        break;
      
      case 'user':
        await getAuthenticatedUser();
        break;
      
      default:
        console.log(`
GitHub Helper Script
====================

Usage:
  npm run github <command>

Commands:
  user                                  - Show authenticated GitHub user
  list                                  - List your recent repositories
  create [name] [description] [private] - Create a new repository
  
Examples:
  npm run github user
  npm run github list
  npm run github create online-reviewer-system "My review system" false
        `);
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
