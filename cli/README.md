# DBV-Git Control CLI

A Git-like version control system for your database schema. Track changes, view history, and compare versions of your database directly from the terminal.

## 🚀 Installation

Install globally via NPM:

```bash
npm install -g dbv-git-control
```

## 🛠️ Getting Started

### 1. Initialize DBV in your project
Go to your project's root directory and run:

```bash
dbv init
```

You will be prompted for:
- **Project Name**: Internal name for your project
- **Target DB URL**: Your PostgreSQL connection string (e.g., `postgresql://user:pass@localhost:5432/my_db`)
- **Remote Server URL**: The address of your DB-Git backend (Default: `http://localhost:3000`)

### 2. Track Changes (Commit)
After modifying your database schema (adding tables, changing columns, etc.), run:

```bash
dbv commit -m "Added users table"
```

### 3. View History
See all previous schema versions:

```bash
dbv log
```

### 4. Compare Versions (Diff)
See what has changed between your current database and the remote head:

```bash
dbv diff
```

Compare two specific versions:
```bash
dbv diff <commit_id_1> <commit_id_2>
```

## 📡 Remote Management

Check or update your remote server settings:

```bash
# Show current remote info
dbv remote

# Set a new remote URL
dbv remote --set-url http://api.my-server.com
```

## 🔄 Updates

The CLI automatically checks for updates. When a new version is released, you can update using:

```bash
npm install -g dbv-git-control
```

---
Built with ❤️ for Database Versioning.
