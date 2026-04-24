export const HF_TOKEN = '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';

export const HF_SYSTEM_PROMPT = `Masz pełny dostęp do HuggingFace Hub przez narzędzia. Używaj ich AKTYWNIE i PROAKTYWNIE.

Możliwości:
- Wyszukuj modele (model_search) i spaces semantycznie (space_search), datasety (dataset_search), wszystkie typy repos (hub_repo_search), artykuły naukowe (paper_search)
- Pobieraj szczegółowe info o modelach (model_details), datasetach (dataset_details), wszystkich repozytoriach (hub_repo_details)
- Przeszukuj dokumentację HF (hf_doc_search, hf_doc_fetch)
- Generuj obrazy (gr1_z_image_turbo_generate)
- Sprawdzaj konto i zalogowanego użytkownika (hf_whoami)
- Listuj Spaces użytkownika (space_info), pliki w Space (space_files), duplikuj Space (duplicate_space)
- Używaj dowolnego Space z interfejsem MCP (use_space), wyszukuj i wywołuj Spaces dynamicznie (dynamic_space)
- Zarządzaj zadaniami obliczeniowymi GPU/CPU (hf_jobs)
- Listuj pliki w repozytoriach (hf_model_files), czytaj pliki (hf_read_file)
- Uruchamiaj modele przez Inference API (hf_inference)
- Listuj własne repozytoria (hf_list_my_repos)
- TWÓRZ nowe Spaces (hf_create_space) — wybierz SDK (gradio/streamlit/docker/static)
- LISTUJ pliki w Space (hf_space_files), USUŃ pojedynczy plik (hf_delete_space_file), USUŃ cały Space (hf_delete_space)
- SPRAWDZAJ status runtime Space (hf_space_runtime) — RUNNING/STOPPED/BUILDING/ERROR
- RESTARTUJ Space (hf_restart_space) — wznów uśpiony lub zawieszony Space
- ZMIEŃ ustawienia Space (hf_space_settings) — widoczność (public/private) lub sprzęt (hardware tier)
- UPLOADUJ pliki do dowolnego repozytorium (hf_upload_file)

OBOWIĄZKOWY WORKFLOW — tworzenie/edycja plików w Spaces:
Gdy tworzysz lub edytujesz pliki dla HF Space, ZAWSZE używaj lokalnego edytora kodu według tego schematu:

1. hf_local_write(workspace, path, content) — zapisz każdy plik lokalnie (app.py, requirements.txt, README.md itd.)
   - Workspace = nazwa space'a lub krótki identyfikator projektu
   - Wywołaj osobno dla każdego pliku
2. hf_local_list(workspace) — opcjonalnie sprawdź co zapisałeś
3. hf_local_push(workspace, space_id, commit_message) — wypchnij WSZYSTKIE pliki naraz do HF Space jednym commitem

NIE używaj hf_edit_space_file bezpośrednio do tworzenia nowych plików — używaj hf_local_write + hf_local_push.
hf_edit_space_file możesz używać tylko do szybkiej edycji pojedynczego istniejącego pliku.

ZAKAZ — nazwy Space (parametr "name" w hf_create_space):
- NIGDY nie dodawaj prefiksu username/owner (błąd: "username/my-space", poprawnie: "my-space")
- NIGDY nie używaj podkreślników _ w nazwie (błąd: "my_space", poprawnie: "my-space")
- Dozwolone: tylko małe litery, cyfry i myślniki, np. "image-classifier", "chat-bot-demo"

Zawsze wywołuj narzędzia żeby udzielić dokładnej, aktualnej odpowiedzi opartej na prawdziwych danych z HF Hub.`;

export const HF_TOOLS = [
        {
                type: 'function',
                function: {
                        name: 'hf_whoami',
                        description: 'Get info about the currently authenticated HuggingFace user',
                        parameters: { type: 'object', properties: {} }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hub_repo_search',
                        description:
                                'Search Hugging Face repositories with a shared query interface. You can target models, datasets, spaces, or aggregate across multiple repo types in one call.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        query: { type: 'string', description: 'Search term' },
                                        repo_types: {
                                                type: 'array',
                                                items: { type: 'string', enum: ['model', 'dataset', 'space'] },
                                                description: 'Repository types to search. Defaults to ["model", "dataset"]'
                                        },
                                        author: {
                                                type: 'string',
                                                description: 'Organization or user namespace to filter by'
                                        },
                                        filters: {
                                                type: 'array',
                                                items: { type: 'string' },
                                                description: 'Optional hub filter tags (e.g. ["text-generation"])'
                                        },
                                        sort: {
                                                type: 'string',
                                                enum: ['trendingScore', 'downloads', 'likes', 'createdAt', 'lastModified'],
                                                description: 'Sort order'
                                        },
                                        limit: { type: 'number', description: 'Max results per repo type (1-100, default 20)' }
                                },
                                required: []
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'model_search',
                        description: 'Search for machine learning models on Hugging Face Hub.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        query: { type: 'string', description: 'Search term' },
                                        author: { type: 'string', description: 'Organization or user namespace to filter by' },
                                        tags: { type: 'array', items: { type: 'string' }, description: 'Filter tags (e.g. ["text-generation"])' },
                                        sort: { type: 'string', enum: ['trendingScore', 'downloads', 'likes', 'createdAt', 'lastModified'], description: 'Sort order' },
                                        limit: { type: 'number', description: 'Max results (1-100, default 10)' }
                                },
                                required: []
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'model_details',
                        description: 'Get detailed information about a specific model on Hugging Face Hub.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        model_id: { type: 'string', description: 'Model ID e.g. google/gemma-2-9b' }
                                },
                                required: ['model_id']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'dataset_search',
                        description: 'Search for datasets on Hugging Face Hub.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        query: { type: 'string', description: 'Search term' },
                                        author: { type: 'string', description: 'Organization or user namespace to filter by' },
                                        tags: { type: 'array', items: { type: 'string' }, description: 'Filter tags' },
                                        sort: { type: 'string', enum: ['trendingScore', 'downloads', 'likes', 'createdAt', 'lastModified'], description: 'Sort order' },
                                        limit: { type: 'number', description: 'Max results (1-100, default 10)' }
                                },
                                required: []
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'dataset_details',
                        description: 'Get detailed information about a specific dataset on Hugging Face Hub.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        dataset_id: { type: 'string', description: 'Dataset ID e.g. mozilla-foundation/common_voice_13_0' }
                                },
                                required: ['dataset_id']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'space_search',
                        description:
                                'Find Hugging Face Spaces using semantic search. Include links to the Space when presenting the results.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        query: { type: 'string', description: 'Semantic Search Query' },
                                        limit: { type: 'number', description: 'Number of results to return' },
                                        mcp: { type: 'boolean', description: 'Only return MCP Server enabled Spaces' }
                                },
                                required: ['query']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'paper_search',
                        description:
                                'Find Machine Learning research papers on the Hugging Face hub. Include links to the paper.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        query: { type: 'string', description: 'Paper search query' },
                                        limit: { type: 'number', description: 'Number of results' }
                                },
                                required: ['query']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hub_repo_details',
                        description:
                                'Get details for one or more Hugging Face repos (model, dataset, or space). Include links to repos in your response.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        repos: {
                                                type: 'array',
                                                items: {
                                                        type: 'object',
                                                        properties: {
                                                                type: { type: 'string', enum: ['model', 'dataset', 'space'] },
                                                                name: { type: 'string', description: 'Repo name e.g. google/gemma-2' }
                                                        },
                                                        required: ['type', 'name']
                                                },
                                                description: 'List of repos to get details for'
                                        }
                                },
                                required: ['repos']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_doc_search',
                        description:
                                'Search and Discover Hugging Face Product and Library documentation. Send an empty query to get the list of available documentation topics.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        query: { type: 'string', description: 'Documentation search query' },
                                        project: {
                                                type: 'string',
                                                description: 'Specific HF project/library to search docs for'
                                        }
                                },
                                required: ['query']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_doc_fetch',
                        description:
                                'Fetch a document from the Hugging Face or Gradio documentation library.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        url: { type: 'string', description: 'Documentation URL to fetch' }
                                },
                                required: ['url']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'duplicate_space',
                        description: 'Duplicate a Hugging Face Space to your own account.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        sourceSpaceId: { type: 'string', description: "Space ID to copy (e.g., 'username/space-name')" },
                                        newSpaceId: { type: 'string', description: 'Name for the new space (optional, defaults to source space-name)' },
                                        hardware: { type: 'string', enum: ['freecpu', 'zerogpu'], description: 'Either "freecpu" or "zerogpu" (defaults based on source)' },
                                        private: { type: 'boolean', description: 'Whether the new space should be private' }
                                },
                                required: ['sourceSpaceId']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'space_info',
                        description: 'List public Hugging Face Spaces for a specific user.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        username: { type: 'string', description: 'Username to get spaces for (defaults to authenticated user)' }
                                }
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'space_files',
                        description: 'List all files in a static Hugging Face Space.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        spaceName: { type: 'string', description: 'Space identifier in format "username/spacename"' },
                                        fileType: { type: 'string', enum: ['all', 'image', 'audio'], description: 'Filter files by type' }
                                },
                                required: ['spaceName']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'use_space',
                        description: 'Give the user access to a Hugging Face Space with mcp_ui interface.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        space_id: { type: 'string', description: "Space ID in 'username/repo' format" }
                                },
                                required: ['space_id']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_jobs',
                        description: 'Manage Hugging Face CPU/GPU compute jobs. Run commands in Docker containers, execute Python scripts with UV. List, schedule and monitor jobs/logs.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        operation: {
                                                type: 'string',
                                                enum: ['run', 'uv', 'ps', 'logs', 'inspect', 'cancel', 'scheduled run', 'scheduled uv', 'scheduled ps', 'scheduled inspect', 'scheduled delete', 'scheduled suspend', 'scheduled resume'],
                                                description: 'Operation to execute'
                                        },
                                        args: { type: 'object', description: 'Operation-specific arguments as a JSON object' }
                                }
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'dynamic_space',
                        description: 'Find (semantic/task search), inspect (view parameter schema) and dynamically invoke Hugging Face Spaces. Call with no arguments for full usage instructions.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        operation: { type: 'string', enum: ['find', 'view_parameters', 'invoke'], description: 'Operation to execute' },
                                        space_name: { type: 'string', description: 'Space ID (format: "username/space-name"). Required for view_parameters or invoke.' },
                                        parameters: { type: 'string', description: 'Required for invoke: JSON object string of parameters' },
                                        search_query: { type: 'string', description: 'For find: search query or task category' },
                                        limit: { type: 'number', description: 'For find: maximum number of results (default 10)' }
                                }
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'gr1_z_image_turbo_generate',
                        description: 'Generate an image using the Z-Image Turbo model based on a text prompt',
                        parameters: {
                                type: 'object',
                                properties: {
                                        prompt: { type: 'string', description: 'Text description of the image to generate' },
                                        resolution: {
                                                type: 'string',
                                                description: 'Output resolution e.g. "1024x1024 ( 1:1 )"',
                                                default: '1024x1024 ( 1:1 )'
                                        },
                                        seed: { type: 'integer', description: 'Seed for reproducibility', default: 42 },
                                        steps: { type: 'number', description: 'Number of diffusion steps', default: 8 },
                                        random_seed: {
                                                type: 'boolean',
                                                description: 'Generate random seed',
                                                default: true
                                        }
                                },
                                required: ['prompt']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_model_files',
                        description: 'List files in a model repository on HuggingFace Hub',
                        parameters: {
                                type: 'object',
                                properties: {
                                        model_id: { type: 'string', description: 'Model ID e.g. google/gemma-2-9b' },
                                        path: { type: 'string', description: 'Subdirectory path (optional)' }
                                },
                                required: ['model_id']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_read_file',
                        description: 'Read a file from an HF repository',
                        parameters: {
                                type: 'object',
                                properties: {
                                        repo_id: { type: 'string', description: 'Repository ID' },
                                        path: { type: 'string', description: 'File path within the repo' },
                                        repo_type: {
                                                type: 'string',
                                                enum: ['model', 'dataset', 'space'],
                                                description: 'Repository type'
                                        }
                                },
                                required: ['repo_id', 'path']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_inference',
                        description: 'Run a model through HuggingFace Inference API',
                        parameters: {
                                type: 'object',
                                properties: {
                                        model_id: { type: 'string', description: 'Model ID to run' },
                                        inputs: { type: 'string', description: 'Input text or data' },
                                        parameters: { type: 'object', description: 'Optional model parameters' }
                                },
                                required: ['model_id', 'inputs']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_list_my_repos',
                        description: 'List own repositories on HuggingFace Hub',
                        parameters: {
                                type: 'object',
                                properties: {
                                        type: {
                                                type: 'string',
                                                enum: ['model', 'dataset', 'space', 'all'],
                                                description: 'Repository type to list'
                                        }
                                }
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_create_space',
                        description: 'Create a new Space on HuggingFace Hub',
                        parameters: {
                                type: 'object',
                                properties: {
                                        name: { type: 'string', description: 'Space name (without username prefix)' },
                                        sdk: {
                                                type: 'string',
                                                enum: ['gradio', 'streamlit', 'docker', 'static'],
                                                description: 'SDK to use'
                                        },
                                        private: { type: 'boolean', description: 'Make the Space private' },
                                        license: { type: 'string', description: 'License (e.g. mit, apache-2.0)' },
                                        description: { type: 'string', description: 'Short description for README.md' }
                                },
                                required: ['name', 'sdk']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_edit_space_file',
                        description: 'Create or edit a file in a HuggingFace Space (app.py, requirements.txt, README.md, etc)',
                        parameters: {
                                type: 'object',
                                properties: {
                                        space_id: { type: 'string', description: 'Full space ID e.g. username/space-name' },
                                        path: { type: 'string', description: 'File path within the space' },
                                        content: { type: 'string', description: 'Full file content to write' },
                                        commit_message: { type: 'string', description: 'Commit message' }
                                },
                                required: ['space_id', 'path', 'content']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_upload_file',
                        description: 'Upload a file to any HuggingFace repository',
                        parameters: {
                                type: 'object',
                                properties: {
                                        repo_id: { type: 'string', description: 'Repository ID' },
                                        repo_type: {
                                                type: 'string',
                                                enum: ['model', 'dataset', 'space'],
                                                description: 'Repository type'
                                        },
                                        path: { type: 'string', description: 'File path within the repo' },
                                        content: { type: 'string', description: 'File content' },
                                        commit_message: { type: 'string', description: 'Commit message' }
                                },
                                required: ['repo_id', 'repo_type', 'path', 'content']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_space_files',
                        description: 'List all files in a HuggingFace Space repository',
                        parameters: {
                                type: 'object',
                                properties: {
                                        space_id: { type: 'string', description: 'Full space ID e.g. username/space-name' }
                                },
                                required: ['space_id']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_delete_space_file',
                        description: 'Delete a specific file from a HuggingFace Space',
                        parameters: {
                                type: 'object',
                                properties: {
                                        space_id: { type: 'string', description: 'Full space ID e.g. username/space-name' },
                                        path: { type: 'string', description: 'File path to delete e.g. app.py' },
                                        commit_message: { type: 'string', description: 'Commit message' }
                                },
                                required: ['space_id', 'path']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_delete_space',
                        description: 'Permanently delete an entire HuggingFace Space',
                        parameters: {
                                type: 'object',
                                properties: {
                                        space_id: { type: 'string', description: 'Full space ID e.g. username/space-name' }
                                },
                                required: ['space_id']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_space_runtime',
                        description: 'Get the current runtime status of a HuggingFace Space (stage: RUNNING, STOPPED, BUILDING, NO_APP_FILE, ERROR, etc.)',
                        parameters: {
                                type: 'object',
                                properties: {
                                        space_id: { type: 'string', description: 'Full space ID e.g. username/space-name' }
                                },
                                required: ['space_id']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_restart_space',
                        description: 'Restart (wake up) a paused, sleeping, or errored HuggingFace Space',
                        parameters: {
                                type: 'object',
                                properties: {
                                        space_id: { type: 'string', description: 'Full space ID e.g. username/space-name' },
                                        factory_reboot: { type: 'boolean', description: 'Hard factory restart that clears cache (default: false)' }
                                },
                                required: ['space_id']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_space_settings',
                        description: 'Update HuggingFace Space settings: visibility (public/private) or hardware tier',
                        parameters: {
                                type: 'object',
                                properties: {
                                        space_id: { type: 'string', description: 'Full space ID e.g. username/space-name' },
                                        private: { type: 'boolean', description: 'true = private, false = public' },
                                        hardware: {
                                                type: 'string',
                                                enum: ['cpu-basic', 'cpu-upgrade', 't4-small', 't4-medium', 'a10g-small', 'a10g-large', 'a100-large'],
                                                description: 'Hardware tier to set'
                                        }
                                },
                                required: ['space_id']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_local_write',
                        description: 'Write a file to the local editor workspace. Use this to create all project files locally first, then push everything to HF Space with hf_local_push.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        workspace: { type: 'string', description: 'Workspace name (use the space name or any short identifier)' },
                                        path: { type: 'string', description: 'File path within the workspace, e.g. app.py or static/index.html' },
                                        content: { type: 'string', description: 'Full file content' }
                                },
                                required: ['workspace', 'path', 'content']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_local_read',
                        description: 'Read a file from the local editor workspace',
                        parameters: {
                                type: 'object',
                                properties: {
                                        workspace: { type: 'string', description: 'Workspace name' },
                                        path: { type: 'string', description: 'File path' }
                                },
                                required: ['workspace', 'path']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_local_list',
                        description: 'List all files in the local editor workspace',
                        parameters: {
                                type: 'object',
                                properties: {
                                        workspace: { type: 'string', description: 'Workspace name' }
                                },
                                required: ['workspace']
                        }
                }
        },
        {
                type: 'function',
                function: {
                        name: 'hf_local_push',
                        description: 'Push all files from the local editor workspace to a HuggingFace Space in one single commit. Always call this after writing files with hf_local_write.',
                        parameters: {
                                type: 'object',
                                properties: {
                                        workspace: { type: 'string', description: 'Workspace name' },
                                        space_id: { type: 'string', description: 'Full space ID e.g. username/space-name' },
                                        commit_message: { type: 'string', description: 'Commit message' }
                                },
                                required: ['workspace', 'space_id']
                        }
                }
        }
];
