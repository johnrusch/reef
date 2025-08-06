# Reef - Multi-Repository GitHub Desktop Client

Reef is a powerful desktop application designed to efficiently manage and work with multiple GitHub repositories simultaneously. It streamlines workflows for developers who regularly work across multiple related projects, microservices, or monorepo structures.

## Features

- **Multi-Repository Management**: View and manage multiple repositories in a unified interface
- **Workspace Organization**: Group related repositories into workspaces
- **Batch Operations**: Execute Git commands across multiple repositories simultaneously
- **GitHub Integration**: Connect with GitHub for enhanced features
- **Cross-Repository Search**: Search code, commits, and issues across all your repositories
- **Real-time Status Updates**: Visual indicators for repository status (ahead/behind, uncommitted changes)
- **Dark Theme**: Modern, developer-friendly dark interface

## Prerequisites

- Node.js 18+ and npm
- Git installed and configured
- GitHub account (for GitHub integration features)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/reef-app/reef.git
cd reef
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

## Building

To build the application for production:

```bash
npm run build
```

This will create distributable packages for your platform in the `dist-electron` directory.

### Platform-specific builds:

- **macOS**: `npm run build:mac`
- **Windows**: `npm run build:win`
- **Linux**: `npm run build:linux`

## Development

### Project Structure

```
reef/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts      # Main entry point
│   │   ├── preload.ts   # Preload script
│   │   └── services/    # Backend services
│   │       ├── gitService.ts
│   │       └── githubService.ts
│   ├── renderer/        # React frontend
│   │   ├── main.tsx     # Renderer entry point
│   │   ├── App.tsx      # Main application component
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── stores/      # Zustand stores
│   │   └── styles/      # CSS styles
│   └── shared/          # Shared types and utilities
├── index.html           # HTML entry point
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── tailwind.config.js   # Tailwind CSS configuration
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start the built application
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Technologies Used

- **Electron** - Cross-platform desktop application framework
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - State management
- **simple-git** - Git operations
- **Octokit** - GitHub API client

## Configuration

### GitHub Authentication

1. Go to Settings in the application
2. Click "Connect GitHub Account"
3. Enter your GitHub personal access token
4. The token will be securely stored in your system's keychain

### Adding Repositories

1. Click the "+" button in the sidebar
2. Browse to select a local repository
3. Or clone a repository from GitHub

### Creating Workspaces

1. Navigate to the Workspaces page
2. Click "New Workspace"
3. Add repositories to the workspace
4. Activate the workspace to filter your view

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

## Roadmap

- [ ] Plugin system for custom extensions
- [ ] Advanced merge conflict resolution
- [ ] Real-time collaboration features
- [ ] Mobile companion app
- [ ] Cloud sync for workspace configurations
- [ ] AI-powered code suggestions
- [ ] Integration with CI/CD pipelines

## Acknowledgments

- Built with Electron and React
- Inspired by the need for better multi-repository management tools
- Thanks to all contributors and the open-source community