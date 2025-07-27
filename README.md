# AI Talk (AITok) - Multi-Model AI Chat Interface

A modern, multi-model AI chat interface with real-time agent visualization and Korean/English language support.

## Features Implemented

### ✅ Core Chat Interface
- Modern Claude/ChatGPT-inspired UI design
- Real-time message streaming with typing indicators
- Korean/English language switching
- Responsive layout with collapsible panels

### ✅ Multi-Model LLM Support
- Support for OpenAI GPT models
- Support for Anthropic Claude models
- Support for local models (Ollama)
- Mock responses for development/testing
- Dynamic model switching during conversations

### ✅ Real-time Agent Visualization
- Process tracking with step-by-step visualization
- Tool usage monitoring
- Performance metrics dashboard
- Decision tree display (framework ready)

### ✅ Conversation Management
- Persistent conversation storage (localStorage)
- Create new conversations
- Auto-save functionality
- Conversation history sidebar
- Smart conversation titles from first message

### ✅ Internationalization
- Full Korean/English language support
- Dynamic language switching
- Korean font support (Noto Sans KR)
- Localized UI elements and messages

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd aitok

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3001`

### Building for Production
```bash
npm run build
```

## Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Zustand** for state management
- **react-i18next** for internationalization
- **Headless UI** for accessible components

### Key Components
- `ChatInterface` - Main chat area with message display and input
- `Header` - Model selector and language switcher
- `Sidebar` - Conversation list and MCP server status
- `AgentPanel` - Real-time agent process visualization

### Services
- `llmService` - Handles communication with different LLM providers
- `Storage` - Manages conversation persistence and app settings

## Configuration

### API Keys
To use real LLM providers, set API keys in the browser console:
```javascript
window.OPENAI_API_KEY = "your-openai-api-key"
window.ANTHROPIC_API_KEY = "your-anthropic-api-key"
```

### Local Models
For local model support, ensure Ollama is running on `localhost:11434`

## Next Steps (TODO)

### 🔄 In Progress
- File upload functionality
- Basic MCP server connection framework

### 📋 Planned Features
- Real streaming implementation for all providers
- File upload and processing (images, documents, code)
- Voice input/output capabilities
- Advanced agent visualization (decision trees)
- Custom model fine-tuning interface
- Team collaboration features
- Enterprise deployment options

## Development

### Project Structure
```
src/
├── components/     # React components
├── hooks/         # Custom React hooks
├── services/      # API and business logic
├── store/         # Zustand state management
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── locales/       # Internationalization files
```

### Adding New Languages
1. Create new translation file in `src/locales/`
2. Import and register in `src/locales/i18n.ts`
3. Add language option to Header component

### Adding New LLM Providers
1. Extend the `llmService.ts` with new provider methods
2. Add provider configuration to `LLMModel` type
3. Update model selector in Header component

## License

MIT License - see LICENSE file for details